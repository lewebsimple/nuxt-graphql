import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { defu } from "defu";
import type { GraphQLSchema } from "graphql";
import { stitchSchemas } from "@graphql-tools/stitch";
import type { Source } from "@graphql-tools/utils";
import {
  addImportsDir,
  addPlugin,
  addServerHandler,
  addServerImportsDir,
  addServerTemplate,
  addTemplate,
  addTypeTemplate,
  createResolver,
  defineNuxtModule,
  useLogger,
} from "@nuxt/kit";
import { clearBuildCache, getCachedLoader } from "./lib/cached-loader";
import { cyan, reset } from "./lib/colors";
import { getContextTemplate, type ContextInput } from "./lib/context";
import { getRelativePath, removeExtension } from "./lib/path";
import { getRemoteSchemaTemplate, introspectRemoteSchema, type RemoteSchemaInput } from "./lib/remote-schema";
import { getDefaultSchema, getSchemaSDL, getSchemaTemplate, loadLocalSchema, type SchemaDef, type SchemaInput } from "./lib/schema";
import { renderAppTypesTemplate, renderServerTypesTemplate, renderSharedTypesTemplate } from "./lib/types";
import { resolveCacheConfig } from "./runtime/shared/lib/cache";
import { getDocuments } from "./lib/documents";
import { getOperationsTemplate, type OperationsInput } from "./lib/operations";
import { getRegistryTemplate, type RegistryInput } from "./lib/registry";
import { version } from "../package.json";

// Nuxt GraphQL module options
export interface NuxtGraphQLModuleOptions {
  /**
   * Client-side GraphQL configuration (HTTP + cache).
   */
  client?: {
    /**
     * Global cache configuration for queries.
     */
    cache?: Partial<GraphQLCacheConfig>;

    /**
     * GraphQL documents glob pattern.
     * Default: "**\/*.gql"
     */
    documents?: string;

    /**
     * Headers forwarded from the SSR request to graphql-request.
     * Default: ["authorization", "cookie"]
     */
    ssrForwardHeaders?: string[];
  };

  /**
   * Where to write graphql.config.json.
   * Resolved from rootDir.
   * Default: ./graphql.config.json
   */
  saveConfig?: string;

  /**
   * Where to write the stitched GraphQL SDL.
   * Resolved from rootDir.
   * Default: server/graphql/schema.graphql
   */
  saveSDL?: string;

  /**
   * Server-side GraphQL configuration (Yoga server + execution).
   */
  server?: {
    /**
     * Paths to GraphQL server context factories relative to rootDir.
     * export default defineGraphQLContext((event: H3Event) => Promise<Record<string, unknown>>)
     */
    context?: string[];

    /**
     * GraphQL schema definition.
     * Key = schemaName.
     */
    schema?: Record<string, SchemaDef>;
  };
}

// Nuxt GraphQL module
export default defineNuxtModule<NuxtGraphQLModuleOptions>({
  meta: {
    name: "nuxt-graphql",
    configKey: "graphql",
  },
  defaults: {},
  async setup(options, nuxt) {
    // ────────────────────────────────────────────────────────────────────────────────
    // Module logger and resolvers
    // ────────────────────────────────────────────────────────────────────────────────

    // Build-time logger
    const logger = useLogger("@lewebsimple/nuxt-graphql");
    logger.info(`Initializing @lewebsimple/nuxt-graphql v${version}`);

    // Module resolver
    const { resolve: resolveModule } = createResolver(import.meta.url);

    // Root resolver (i.e. user-provided paths in rootDir)
    const { rootDir } = nuxt.options;
    const { resolve: resolveRoot, resolvePath: rawResolveRootPath } = createResolver(rootDir);
    async function resolveRootPath(path: string) {
      return removeExtension(await rawResolveRootPath(path));
    }

    // Nuxt / Nitro aliases
    const nuxtAliases: Record<string, string> = {};
    const nitroAliases: Record<string, string> = {};

    // ────────────────────────────────────────────────────────────────────────────────
    // GraphQL context
    // ────────────────────────────────────────────────────────────────────────────────

    const contextInput: ContextInput = {
      importPaths: await Promise.all((options.server?.context || []).map((path) => resolveRootPath(path))),
    };

    // Choose between .ts / .mjs + .d.ts context templates based on dev / build mode
    // @see https://github.com/nuxt/nuxt/discussions/34154
    let contextDst: string;
    if (nuxt.options.dev || process.env.NUXT_MODULE_PREPARE) {
      logger.info("Development mode detected: using TypeScript GraphQL context template.");
      contextDst = addTemplate({ filename: "graphql/context.ts", getContents: () => getContextTemplate(contextInput).ts, write: true }).dst;
      addServerTemplate({ filename: "graphql/context.mjs", getContents: () => getContextTemplate(contextInput).mjs });
    }
    else {
      logger.info("Production mode detected: using MJS GraphQL context template.");
      contextDst = addTemplate({ filename: "graphql/context.mjs", getContents: () => getContextTemplate(contextInput).mjs, write: true }).dst;
      addServerTemplate({ filename: "graphql/context.mjs", getContents: () => getContextTemplate(contextInput).mjs });
      addTypeTemplate({ filename: "graphql/context.d.ts", getContents: () => getContextTemplate(contextInput).dts });
    }
    nuxtAliases["#graphql/context"] = contextDst;
    nitroAliases["#graphql/context"] = contextDst;

    // ────────────────────────────────────────────────────────────────────────────────
    // GraphQL schema
    // ────────────────────────────────────────────────────────────────────────────────

    const schemaInput: SchemaInput = { local: {}, remote: {} };
    const schemaLoaders: Record<string, () => Promise<GraphQLSchema>> = {};

    for (const [schemaName, schemaDef] of Object.entries(options.server?.schema || {})) {
      // Validate schemaName, i.e. can be used as file name
      if (!/^[a-z_][\w-]*$/i.test(schemaName)) {
        throw new Error(`Invalid schema name "${schemaName}". Only alphanumeric characters, underscores and hyphens are allowed, and it cannot start with a number.`);
      }

      // Local schema
      if (schemaDef.type === "local") {
        const importPath = await resolveRootPath(schemaDef.path);
        schemaInput.local[schemaName] = { importPath };
        schemaLoaders[schemaName] = getCachedLoader<GraphQLSchema>(`schema:local:${schemaName}`, async () => await loadLocalSchema({ importPath }));
      }

      // Remote schema
      else if (schemaDef.type === "remote") {
        const { endpoint } = schemaDef;
        const remoteSchemaInput: RemoteSchemaInput = {
          endpoint,
          loadSchema: getCachedLoader<GraphQLSchema>(`schema:remote:${schemaName}`, async () => await introspectRemoteSchema({ endpoint })),
        };
        const filename = `graphql/schemas/${schemaName}.ts`;
        addTemplate({ filename, getContents: async () => await getRemoteSchemaTemplate(remoteSchemaInput), write: true });
        addServerTemplate({ filename, getContents: async () => await getRemoteSchemaTemplate(remoteSchemaInput) });
        schemaInput.remote[schemaName] = { importPath: `./schemas/${schemaName}` };
        schemaLoaders[schemaName] = remoteSchemaInput.loadSchema;
      }

      // Unknown schema type
      else {
        throw new Error(`Unknown schema type for schema "${schemaName}"`);
      }
    }

    // Stitched schema
    const schemaDst = addTemplate({ filename: `graphql/schema.ts`, getContents: () => getSchemaTemplate(schemaInput), write: true }).dst;
    addServerTemplate({ filename: `graphql/schema.ts`, getContents: () => getSchemaTemplate(schemaInput) });
    nuxtAliases["#graphql/schema"] = schemaDst;
    nitroAliases["#graphql/schema"] = schemaDst;

    // ────────────────────────────────────────────────────────────────────────────────
    // GraphQL schema / documents cached loaders
    // ────────────────────────────────────────────────────────────────────────────────

    const sdlPath = resolveRoot(options.saveSDL || "server/graphql/schema.graphql");

    const loadSchema = getCachedLoader<GraphQLSchema>("schema:stitched", async () => {
      const subschemas = await Promise.all(Object.values(schemaLoaders).map((loadSchema) => loadSchema()));
      if (subschemas.length === 0) {
        logger.warn(`No GraphQL schemas defined: using default empty schema.`);
        subschemas.push(getDefaultSchema());
      }
      const schema = stitchSchemas({
        subschemas,
      });

      // Save SDL to file
      const sdl = getSchemaSDL(schema);
      mkdirSync(dirname(sdlPath), { recursive: true });
      writeFileSync(sdlPath, sdl, { encoding: "utf-8" });
      logger.info(`Stitched GraphQL SDL saved to: ${cyan}${getRelativePath(rootDir, sdlPath)}${reset}`);

      return schema;
    });

    const loadDocuments = getCachedLoader<Source[], [string]>("documents", async (documentsGlob) => {
      const documents = await getDocuments(documentsGlob);
      if (documents.length === 0) {
        logger.warn(`No GraphQL documents found for glob pattern: ${cyan}${documentsGlob}${reset}`);
      }
      return documents;
    });

    // ────────────────────────────────────────────────────────────────────────────────
    // GraphQL operations
    // ────────────────────────────────────────────────────────────────────────────────

    const operationsInput: OperationsInput = {
      loadSchema,
      loadDocuments,
      documentGlob: options.client?.documents || "**/*.gql",
    };

    const operationsDst = addTemplate({ filename: "graphql/operations.ts", getContents: async () => (await getOperationsTemplate(operationsInput)), write: true }).dst;
    addServerTemplate({ filename: "graphql/operations.ts", getContents: async () => (await getOperationsTemplate(operationsInput)) });
    nuxtAliases["#graphql/operations"] = operationsDst;
    nitroAliases["#graphql/operations"] = operationsDst;

    // ────────────────────────────────────────────────────────────────────────────
    // Operations registry
    // ────────────────────────────────────────────────────────────────────────────

    const registryInput: RegistryInput = {
      loadDocuments,
      documentGlob: options.client?.documents || "**/*.gql",
    };

    // Generate registry module
    addTemplate({ filename: "graphql/registry.ts", getContents: async () => (await getRegistryTemplate(registryInput)), write: true });
    addServerTemplate({ filename: "graphql/registry.ts", getContents: async () => (await getRegistryTemplate(registryInput)) });

    // ────────────────────────────────────────────────────────────────────────────
    // GraphQL config
    // ────────────────────────────────────────────────────────────────────────────

    const configPath = resolveRoot(options.saveConfig || "graphql.config.json");
    const config = {
      schema: getRelativePath(rootDir, sdlPath),
      documents: options.client?.documents || "**/*.gql",
    };
    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(configPath, JSON.stringify(config, null, 2), { encoding: "utf-8" });
    logger.info(`GraphQL config saved to: ${cyan}${getRelativePath(rootDir, configPath)}${reset}`);

    // ────────────────────────────────────────────────────────────────────────────
    // Nuxt / Nitro aliases
    // ────────────────────────────────────────────────────────────────────────────

    nuxt.options.alias = defu(nuxt.options.alias, nuxtAliases);
    nuxt.hook("nitro:config", (nitroConfig) => {
      nitroConfig.alias = defu(nitroConfig.alias, nitroAliases);
    });

    // ────────────────────────────────────────────────────────────────────────────
    // Types injection
    // ────────────────────────────────────────────────────────────────────────────

    addTypeTemplate({ filename: "types/nuxt-graphql.app.d.ts", getContents: () => renderAppTypesTemplate() }, { nuxt: true });
    addTypeTemplate({ filename: "types/nuxt-graphql.server.d.ts", getContents: () => renderServerTypesTemplate() }, { nitro: true, node: true });
    addTypeTemplate({ filename: "types/nuxt-graphql.shared.d.ts", getContents: () => renderSharedTypesTemplate() }, { nuxt: true, nitro: true, node: true });

    // ─────────────────────────────────────────────────────────────
    // Runtime configuration
    // ─────────────────────────────────────────────────────────────

    nuxt.options.runtimeConfig.public.graphql = defu(nuxt.options.runtimeConfig.public.graphql, {
      cacheConfig: resolveCacheConfig(options.client?.cache),
      ssrForwardHeaders: options.client?.ssrForwardHeaders || ["authorization", "cookie"],
    });

    // ─────────────────────────────────────────────────────────────
    // File watchers
    // ─────────────────────────────────────────────────────────────

    if (nuxt.options.dev) {
      nuxt.hook("builder:watch", async (_event, changedPath) => {
        if (changedPath.endsWith(".gql")) {
          logger.info(`Documents change detected: ${cyan}${getRelativePath(rootDir, changedPath)}${reset}`);
          clearBuildCache(["documents", "operations", "registry"]);
        }
      });
    }

    // ─────────────────────────────────────────────────────────────
    // GraphQL Yoga server endpoint
    // ─────────────────────────────────────────────────────────────

    const handler = resolveModule("./runtime/server/api/graphql");
    addServerHandler({ route: "/api/graphql", handler });
    nuxt.hook("listen", (_, { url }) => {
      logger.success(`GraphQL Yoga ready: ${cyan}${url.replace(/\/$/, "")}/api/graphql${reset}`);
    });

    // ─────────────────────────────────────────────────────────────
    // GraphQL client plugins
    // ─────────────────────────────────────────────────────────────

    addPlugin(resolveModule("./runtime/app/plugins/graphql-request"));
    addPlugin(resolveModule("./runtime/app/plugins/graphql-sse.client"));

    // ─────────────────────────────────────────────────────────────
    // Composables and server utils
    // ─────────────────────────────────────────────────────────────

    addImportsDir(resolveModule("./runtime/app/composables"));
    addServerImportsDir(resolveModule("./runtime/server/utils"));
  },
});
