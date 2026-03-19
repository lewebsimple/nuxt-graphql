import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { stitchSchemas } from "@graphql-tools/stitch";
import { extendSchemaWithZodDirectives } from "@lewebsimple/graphql-codegen-zod/extend-schema";
import {
  addImportsDir,
  addPlugin,
  addServerHandler,
  addServerImports,
  addServerImportsDir,
  createResolver,
  defineNuxtModule,
  updateTemplates,
  useLogger,
} from "@nuxt/kit";
import { defu } from "defu";
import { buildSchema, type GraphQLSchema } from "graphql";
import { cyan } from "picocolors";
import picomatch from "picomatch";

import { version } from "../package.json";

import { clearBuildCache, getCachedLoader } from "./lib/cached-loader";
import { getContextTemplate, resolveContextInput } from "./lib/context";
import { isGraphQLDocumentChange, loadDocuments, resolveDocumentGlobs } from "./lib/documents";
import { toRelativePath } from "./lib/path";
import { addRegistryArtifactTemplates, generateRegistryArtifacts } from "./lib/registry";
import {
  getRemoteSchemaTemplate,
  getSchemaSDL,
  getSchemaTemplate,
  loadLocalSchema,
  loadRemoteSchema,
  resolveSchemaDefs,
  type SchemaDef,
  type SchemaInput,
} from "./lib/schema";
import { addCompiledTemplate } from "./lib/ts-compiler";
import { resolveCacheConfig, type CacheConfig } from "./runtime/app/lib/cache-config";

/** Module configuration accepted by `nuxt.config` under `graphql`. */
export interface NuxtGraphQLModuleOptions {
  /** Client-side GraphQL options. */
  client?: {
    /** Document globs used for code generation. */
    documents?: string[];
    /** Runtime cache configuration overrides. */
    cache?: Partial<CacheConfig>;
    /** Incoming SSR header names to forward to GraphQL HTTP calls. */
    ssrForwardHeaders?: string[];
  };
  /** Server-side GraphQL options. */
  server?: {
    /** Context factory module paths. */
    context?: string[];
    /** Local and remote schema definitions. */
    schema?: SchemaDef[];
  };
  /** Optional output path for generated `graphql.config.json`. */
  saveConfig?: string;
  /** Optional output path for generated schema SDL file. */
  saveSDL?: string;
}

declare module "nuxt/schema" {
  interface PublicRuntimeConfig {
    graphql: {
      cacheConfig: CacheConfig;
      ssrForwardHeaders: string[];
    };
  }
}

export default defineNuxtModule<NuxtGraphQLModuleOptions>({
  meta: {
    name: "nuxt-graphql",
    configKey: "graphql",
  },
  defaults: {},
  async setup(options, nuxt) {
    // Build-time logger
    const logger = useLogger("@lewebsimple/nuxt-graphql");
    logger.info(`@lewebsimple/nuxt-graphql v${version} loaded`);

    // Resolvers
    const { rootDir } = nuxt.options;
    const { resolve: resolveModule } = createResolver(import.meta.url);
    const { resolve: resolveRoot } = createResolver(rootDir);

    // Nuxt / Nitro aliases
    const nuxtAliases: Record<string, string> = {};
    const nitroAliases: Record<string, string> = {};

    // Transpile entries
    const transpileEntries = new Set<string>();

    // ────────────────────────────────────────────────────────────────────────────
    // GraphQL context
    // ────────────────────────────────────────────────────────────────────────────

    // GraphQL context factory utility
    addServerImports({
      name: "defineGraphQLContext",
      from: resolveModule("runtime/server/lib/context"),
    });

    // Resolve context input and transpile user-defined context factories
    const contextInput = await resolveContextInput({ paths: options.server?.context ?? [] }, nuxt);
    contextInput.paths.forEach((path) => transpileEntries.add(dirname(path)));

    // GraphQL context server template
    const { dst: contextDst } = await addCompiledTemplate(
      { filename: "graphql/context", getContents: () => getContextTemplate(contextInput) },
      nuxt,
    );
    nitroAliases["#graphql/context"] = contextDst;

    // ────────────────────────────────────────────────────────────────────────────
    // GraphQL schema
    // ────────────────────────────────────────────────────────────────────────────

    // GraphQL remote executor hooks utility
    addServerImports({
      name: "defineRemoteExecutorHooks",
      from: resolveModule("runtime/server/lib/remote-executor"),
    });
    nitroAliases["#graphql/runtime/remote-executor"] = resolveModule(
      "runtime/server/lib/remote-executor",
    );

    // Resolve schema definitions
    const schemaDefs = await resolveSchemaDefs(options.server?.schema ?? [], nuxt);

    // Schema input for server template
    const schemaInput: SchemaInput = {
      localPaths: [],
      remotePaths: [],
    };

    // Schema loaders
    const schemaLoaders: Array<() => Promise<GraphQLSchema>> = [];

    for (const [index, schemaDef] of schemaDefs.entries()) {
      switch (schemaDef.type) {
        case "local": {
          // Cached local schema loader
          const loadSchema = getCachedLoader(
            `graphql:schema:local-${index}`,
            async () => await loadLocalSchema(schemaDef.path, nuxt),
          );
          schemaLoaders.push(loadSchema);

          // Transpile user-defined local schema and add to schema input
          transpileEntries.add(dirname(schemaDef.path));
          schemaInput.localPaths.push(schemaDef.path);
          break;
        }

        case "remote": {
          // Cached remote schema loader
          const schemaLoader = getCachedLoader(
            `graphql:schema:remote-${index}`,
            async () => await loadRemoteSchema(schemaDef.endpoint, schemaDef.headers ?? {}),
          );
          schemaLoaders.push(schemaLoader);

          // Transpile user-defined hooks
          (schemaDef.hooks ?? []).forEach((hookPath) => transpileEntries.add(dirname(hookPath)));

          // Remote schema server template
          await addCompiledTemplate(
            {
              filename: `graphql/schemas/remote-${index}`,
              getContents: async () =>
                getRemoteSchemaTemplate({
                  ...schemaDef,
                  sdl: getSchemaSDL(await schemaLoader()),
                }),
            },
            nuxt,
          );
          schemaInput.remotePaths.push(`./schemas/remote-${index}`);
          break;
        }
      }
    }

    // GraphQL schema server template
    const { dst: schemaDst } = await addCompiledTemplate(
      {
        filename: "graphql/schema",
        getContents: () => getSchemaTemplate(schemaInput),
      },
      nuxt,
    );
    nitroAliases["#graphql/schema"] = schemaDst;

    // ────────────────────────────────────────────────────────────────────────────
    // GraphQL schema loader
    // ────────────────────────────────────────────────────────────────────────────

    const sdlPath = resolveRoot(options.saveSDL || ".nuxt/graphql/schema.graphql");
    await mkdir(dirname(sdlPath), { recursive: true });

    const loadSchemaCached = getCachedLoader("graphql:schema", async () => {
      const schemas = await Promise.all(schemaLoaders.map((loader) => loader()));

      let schema: GraphQLSchema;
      if (!schemas.length) {
        if (!nuxt.options._prepare) {
          logger.warn("No GraphQL schemas loaded: using default empty schema.");
        }
        schema = buildSchema("type Query { _empty: String }");
      } else {
        schema = stitchSchemas({ subschemas: schemas });
        if (!schema) {
          throw new Error("Failed to load GraphQL schema");
        }
      }
      schema = extendSchemaWithZodDirectives(schema);

      // Save schema.graphql to disk
      if (nuxt.options.dev) {
        const sdl = getSchemaSDL(schema);
        await writeFile(sdlPath, sdl);
      }

      return schema;
    });

    // ────────────────────────────────────────────────────────────────────────────
    // GraphQL documents loader
    // ────────────────────────────────────────────────────────────────────────────

    const documentGlobs = await resolveDocumentGlobs(
      (options.client?.documents ?? nuxt.options._prepare)
        ? []
        : ["app/**/*.{gql,ts,vue}", "server/**/*.{gql,ts}", "shared/**/*.{gql,ts}"],
      nuxt,
    );
    const loadDocumentsCached = getCachedLoader("graphql:documents", async (globs: string[]) =>
      loadDocuments(globs),
    );

    // ────────────────────────────────────────────────────────────────────────────
    // GraphQL registry loader
    // ────────────────────────────────────────────────────────────────────────────

    const generateRegistryCached = getCachedLoader(
      "graphql:registry",
      async (globs: string[]) =>
        await generateRegistryArtifacts({
          schema: await loadSchemaCached(),
          documents: await loadDocumentsCached(globs),
        }),
    );

    // ────────────────────────────────────────────────────────────────────────────
    // GraphQL registry loader
    // ────────────────────────────────────────────────────────────────────────────

    const syncRegistryTemplates = async () =>
      await addRegistryArtifactTemplates(await generateRegistryCached(documentGlobs), nuxt);

    const { registryDst, typesDts } = await syncRegistryTemplates();
    const typesPath = typesDts.replace(/\.d\.ts$/, "");
    nuxtAliases["#graphql/registry"] = registryDst;
    nitroAliases["#graphql/registry"] = registryDst;

    // ────────────────────────────────────────────────────────────────────────────
    // GraphQL types
    // ────────────────────────────────────────────────────────────────────────────

    nuxtAliases["#graphql/types"] = typesPath;
    nitroAliases["#graphql/types"] = typesPath;

    // ────────────────────────────────────────────────────────────────────────────
    // File watchers
    // ────────────────────────────────────────────────────────────────────────────

    if (nuxt.options.dev) {
      const schemaWatchPaths = schemaDefs
        .filter((schemaDef) => schemaDef.type === "local")
        .map((schemaDef) => schemaDef.path);

      const isDocument = picomatch(documentGlobs);

      nuxt.hook("builder:watch", async (event, path) => {
        // Local schema change
        if (schemaWatchPaths.some((schemaPath) => path.includes(schemaPath))) {
          logger.info(`Local schema change detected: ${path}`);
          clearBuildCache(["graphql:schema", "graphql:registry"]);
          await syncRegistryTemplates();
          await updateTemplates({ filter: (template) => template.filename.startsWith("graphql/") });
        }

        // GraphQL document change
        if (isDocument(path) && (await isGraphQLDocumentChange(path, event))) {
          logger.info(`Document change detected: ${path}`);
          clearBuildCache(["graphql:documents", "graphql:registry"]);
          await syncRegistryTemplates();
          await updateTemplates({ filter: (template) => template.filename.startsWith("graphql/") });
        }
      });
    }

    // ────────────────────────────────────────────────────────────────────────────
    // GraphQL config
    // ────────────────────────────────────────────────────────────────────────────

    if (nuxt.options.dev) {
      const configPath = resolveRoot(options.saveConfig || "graphql.config.json");
      const config = {
        schema: toRelativePath(rootDir, sdlPath),
        documents: documentGlobs.map((glob) => toRelativePath(rootDir, glob)),
        extensions: {
          codegen: {
            config: {
              scalars: {
                ZodValue: "unknown",
              },
            },
          },
        },
      };
      await writeFile(configPath, JSON.stringify(config, null, 2));
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Nuxt / Nitro aliases, transpilation and types registration
    // ────────────────────────────────────────────────────────────────────────────

    nuxt.options.alias = defu(nuxt.options.alias, nuxtAliases);
    nuxt.options.nitro.alias = defu(nuxt.options.nitro.alias, nitroAliases);
    nuxt.options.build.transpile = [...nuxt.options.build.transpile, ...transpileEntries];

    // ─────────────────────────────────────────────────────────────
    // Runtime configuration
    // ─────────────────────────────────────────────────────────────

    nuxt.options.runtimeConfig.public.graphql = defu(nuxt.options.runtimeConfig.public.graphql, {
      cacheConfig: resolveCacheConfig(options.client?.cache),
      ssrForwardHeaders: options.client?.ssrForwardHeaders || ["authorization", "cookie"],
    });

    // ────────────────────────────────────────────────────────────────────────────
    // GraphQL Yoga server endpoint
    // ────────────────────────────────────────────────────────────────────────────

    const handler = resolveModule("runtime/server/api/graphql");
    addServerHandler({ route: "/api/graphql", handler });
    nuxt.hook("listen", (_, { url }) => {
      logger.success(`GraphQL endpoint available at ${cyan(`${url}api/graphql`)}`);
    });

    // ─────────────────────────────────────────────────────────────
    // GraphQL client plugins
    // ─────────────────────────────────────────────────────────────

    addPlugin(resolveModule("runtime/app/plugins/graphql"));
    addPlugin(resolveModule("runtime/app/plugins/graphql-sse.client"));

    // ─────────────────────────────────────────────────────────────
    // Composables and server utils
    // ─────────────────────────────────────────────────────────────

    addImportsDir(resolveModule("runtime/app/composables"));
    addImportsDir(resolveModule("runtime/shared/utils"));
    addServerImportsDir(resolveModule("runtime/server/utils"));
    addServerImportsDir(resolveModule("runtime/shared/utils"));
  },
});
