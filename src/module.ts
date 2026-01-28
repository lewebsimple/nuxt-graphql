import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { defu } from "defu";
import type { GraphQLSchema } from "graphql";
import { stitchSchemas } from "@graphql-tools/stitch";
import type { Source } from "@graphql-tools/utils";
import { defineNuxtModule, createResolver, useLogger, addServerHandler, addServerImportsDir, addImportsDir, addPlugin } from "@nuxt/kit";
import { clearBuildCache, getCachedLoader } from "./lib/cached-loader";
import { cyan, reset } from "./lib/colors";
import { getContextTemplate, type ContextInput } from "./lib/context";
import { getRelativePath, removeExtension } from "./lib/path";
import { getDefaultSchema, getRemoteSchemaTemplate, getSchemaSDL, getSchemaTemplate, introspectRemoteSchema, loadLocalSchema, type RemoteSchemaInput, type SchemaDef, type SchemaInput } from "./lib/schema";
import { addUniversalTemplate } from "./lib/template";
import { version } from "../package.json";
import { getDocuments } from "./lib/documents";
import { getOperationsTemplate, type OperationsInput } from "./lib/operations";
import { getRegistryTemplate, type RegistryInput } from "./lib/registry";
import { resolveCacheConfig } from "./runtime/app/lib/cache";
import type { CacheConfig } from "./runtime/shared/lib/types";

export interface NuxtGraphQLModuleOptions {
  client?: {
    documents?: string;
    cache?: Partial<CacheConfig>;
    ssrForwardHeaders?: string[];
  };
  server?: {
    context?: string[];
    schema?: Record<string, SchemaDef>;
  };
  saveConfig?: string;
  saveSDL?: string;
}

export default defineNuxtModule<NuxtGraphQLModuleOptions>({
  meta: {
    name: "@lewebsimple/nuxt-graphql",
    configKey: "graphql",
  },
  defaults: {},
  async setup(options, nuxt) {
    // Build-time logger
    const logger = useLogger("@lewebsimple/nuxt-graphql");
    logger.info(`@lewebsimple/nuxt-graphql v${version} loaded`);

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

    const emitTs = Boolean(nuxt.options.dev) || Boolean(process.env.NUXT_MODULE_PREPARE);

    // ────────────────────────────────────────────────────────────────────────────────
    // Runtime helpers
    // ────────────────────────────────────────────────────────────────────────────────

    nuxtAliases["#graphql/runtime/remote-executor"] = resolveModule("./runtime/server/lib/remote-executor");
    nitroAliases["#graphql/runtime/remote-executor"] = resolveModule("./runtime/server/lib/remote-executor");

    // ────────────────────────────────────────────────────────────────────────────
    // GraphQL conttext
    // ────────────────────────────────────────────────────────────────────────────

    const contextInput: ContextInput = {
      importPaths: await Promise.all((options.server?.context || []).map((path) => resolveRootPath(path))),
    };
    const contextPath = addUniversalTemplate({ filename: "graphql/context", getContents: () => getContextTemplate(contextInput), emitTs });
    nuxtAliases["#graphql/context"] = contextPath;
    nitroAliases["#graphql/context"] = contextPath;

    // ────────────────────────────────────────────────────────────────────────────
    // GraphQL schema
    // ────────────────────────────────────────────────────────────────────────────

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
        const loadSchema = getCachedLoader<GraphQLSchema>(`schema:local:${schemaName}`, async () => await loadLocalSchema({ importPath }));
        schemaInput.local[schemaName] = { importPath };
        schemaLoaders[schemaName] = loadSchema;
      }

      // Remote schema
      else if (schemaDef.type === "remote") {
        const { endpoint } = schemaDef;
        const loadSchema = getCachedLoader<GraphQLSchema>(`schema:remote:${schemaName}`, async () => await introspectRemoteSchema({ endpoint }));
        const hooks = await Promise.all((schemaDef.hooks || []).map(async (hookPath) => ({ importPath: await resolveRootPath(hookPath) })));
        const remoteSchemaInput: RemoteSchemaInput = { endpoint, headers: schemaDef.headers || {}, hooks, loadSchema };
        addUniversalTemplate({ filename: `graphql/schemas/${schemaName}`, getContents: () => getRemoteSchemaTemplate(remoteSchemaInput), emitTs });
        schemaInput.remote[schemaName] = { importPath: `./schemas/${schemaName}` };
        schemaLoaders[schemaName] = loadSchema;
      }

      // Unknown schema type
      else {
        throw new Error(`Unknown schema type for schema "${schemaName}"`);
      }
    }

    // Stitched schema
    const schemaPath = addUniversalTemplate({ filename: "graphql/schema", getContents: () => getSchemaTemplate(schemaInput), emitTs });
    nuxtAliases["#graphql/schema"] = schemaPath;
    nitroAliases["#graphql/schema"] = schemaPath;

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
      const schema = stitchSchemas({ subschemas });

      // Save SDL to file (dev mode only)
      if (nuxt.options.dev) {
        const sdl = getSchemaSDL(schema);
        mkdirSync(dirname(sdlPath), { recursive: true });
        writeFileSync(sdlPath, sdl, { encoding: "utf-8" });
        logger.info(`Stitched GraphQL SDL saved to: ${cyan}${getRelativePath(rootDir, sdlPath)}${reset}`);
      }

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

    const operationsInput: OperationsInput = { loadSchema, loadDocuments, documentGlob: options.client?.documents || "**/*.gql" };
    const operationsPath = addUniversalTemplate({ filename: "graphql/operations", getContents: () => getOperationsTemplate(operationsInput), emitTs });
    nuxtAliases["#graphql/operations"] = operationsPath;
    nitroAliases["#graphql/operations"] = operationsPath;

    // ────────────────────────────────────────────────────────────────────────────
    // Operations registry
    // ────────────────────────────────────────────────────────────────────────────

    const registryInput: RegistryInput = { loadDocuments, documentGlob: options.client?.documents || "**/*.gql" };
    const registryPath = addUniversalTemplate({ filename: "graphql/registry", getContents: () => getRegistryTemplate(registryInput), emitTs });
    nuxtAliases["#graphql/registry"] = registryPath;
    nitroAliases["#graphql/registry"] = registryPath;

    // ────────────────────────────────────────────────────────────────────────────
    // GraphQL config
    // ────────────────────────────────────────────────────────────────────────────

    if (nuxt.options.dev) {
      const configPath = resolveRoot(options.saveConfig || "graphql.config.json");
      const config = {
        schema: getRelativePath(rootDir, sdlPath),
        documents: options.client?.documents || "**/*.gql",
      };
      mkdirSync(dirname(configPath), { recursive: true });
      writeFileSync(configPath, JSON.stringify(config, null, 2), { encoding: "utf-8" });
      logger.info(`GraphQL config saved to: ${cyan}${getRelativePath(rootDir, configPath)}${reset}`);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Nuxt / Nitro aliases
    // ────────────────────────────────────────────────────────────────────────────

    nuxt.options.alias = defu(nuxt.options.alias, nuxtAliases);
    nuxt.hook("nitro:config", (nitroConfig) => {
      nitroConfig.alias = defu(nitroConfig.alias, nitroAliases);
    });

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

    // ────────────────────────────────────────────────────────────────────────────
    // GraphQL Yoga server endpoint
    // ────────────────────────────────────────────────────────────────────────────

    const handler = resolveModule("./runtime/server/api/graphql");
    addServerHandler({ route: "/api/graphql", handler });
    nuxt.hook("listen", (_, { url }) => {
      logger.success(`GraphQL Yoga ready: ${cyan}${url.replace(/\/$/, "")}/api/graphql${reset}`);
    });

    // ─────────────────────────────────────────────────────────────
    // GraphQL client plugins
    // ─────────────────────────────────────────────────────────────

    addPlugin(resolveModule("./runtime/app/plugins/execute-graphql"));
    addPlugin(resolveModule("./runtime/app/plugins/graphql-sse.client"));

    // ─────────────────────────────────────────────────────────────
    // Composables and server utils
    // ─────────────────────────────────────────────────────────────

    addImportsDir(resolveModule("./runtime/app/composables"));
    addImportsDir(resolveModule("./runtime/shared/utils"));
    addServerImportsDir(resolveModule("./runtime/server/utils"));
    addServerImportsDir(resolveModule("./runtime/shared/utils"));
  },
});
