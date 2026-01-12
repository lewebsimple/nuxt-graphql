import { join } from "node:path";
import { defineNuxtModule, addPlugin, createResolver, getLayerDirectories, addServerHandler, addImportsDir, addServerImportsDir } from "@nuxt/kit";
import { getGraphQLContextProxy } from "./helpers/context";
import { findSingleFile, toRelativePath, writeFileIfChanged, type GlobPattern } from "./helpers/file-operations";
import { resolveCacheConfig, type CacheConfig } from "./helpers/cache-config";
import { runGraphQLCodegen } from "./helpers/codegen";
import { cyan, logger, reset } from "./helpers/logger";
import { getRegistryContent } from "./helpers/registry";
import { getLocalSchemaProxy, getRemoteSchemaProxy, getSDLFromGraphQLSchema, getStitchedSchemaProxy, loadGraphQLSchema, type SchemaDef } from "./helpers/schema";
import { getGenericServerProxy } from "./helpers/server-proxy";
import { getYogaMiddlewareProxy } from "./helpers/yoga-middleware";

// Nuxt GraphQL module options
export interface NuxtGraphQLModuleOptions {
  // GraphQL schema(s) definition
  schemas: Record<string, SchemaDef>;
  // Optional GraphQL context definition file (relative to rootDir, defaults to empty context)
  context?: string;
  // Optional GraphQL documents glob pattern (defaults to **/*.gql)
  documents?: GlobPattern;
  // Optional GraphQL Config save path (relative to rootDir, defaults to graphql.config.json)
  saveConfig?: string;
  // Optional GraphQL SDL save path (relative to rootDir, defaults to .nuxt/graphql/schema.graphql)
  saveSdl?: string;
  // Optional Yoga middleware file (relative to rootDir)
  middleware?: string;
  // Optional GraphQL cache configuration (query results caching)
  cache?: Partial<CacheConfig>;
}

export default defineNuxtModule<NuxtGraphQLModuleOptions>({
  meta: {
    name: "@lewebsimple/nuxt-graphql",
    configKey: "graphql",
  },
  defaults: {
  },
  async setup(options, nuxt) {
    // Initialize path resolution / alias
    const { resolve } = createResolver(import.meta.url);
    const { buildDir, rootDir } = nuxt.options;
    const layerRootDirs = getLayerDirectories(nuxt).map(({ root }) => root);
    nuxt.options.alias ||= {};

    // Skip module setup during playground module build and stub GraphQL artifacts from playground
    // @see https://github.com/nuxt/module-builder/issues/704
    if (process.env.PLAYGROUND_MODULE_BUILD) {
      return;
    }

    // Initialize runtime configuration
    nuxt.options.runtimeConfig.public.graphql = {
      cacheConfig: resolveCacheConfig(options.cache),
    };

    // Initialize server-only proxies definition
    const serverProxies: Record<string, string> = {};

    // Setup GraphQL context (server-only proxy)
    const contextPath = options.context ? await findSingleFile(layerRootDirs, options.context, true) : undefined;
    if (contextPath) {
      logger.info(`GraphQL context registered: ${cyan}${toRelativePath(rootDir, contextPath)}${reset}`);
    }
    serverProxies["context"] = getGraphQLContextProxy(contextPath);

    // Shared remote executor helper (server-only proxy)
    serverProxies["remote-executor"] = getGenericServerProxy(resolve("./runtime/server/lib/remote-executor.ts"));

    // Setup GraphQL schema(s) and stitched schema (server-only proxies)
    for (const [schemaName, schemaDef] of Object.entries(options.schemas)) {
      switch (schemaDef.type) {
        case "local": {
          serverProxies[`schemas/${schemaName}`] = await getLocalSchemaProxy({ layerRootDirs, schemaDef });
          break;
        }
        case "remote": {
          const { middlewareContent, sdlContent, schemaContent } = await getRemoteSchemaProxy({ rootDir, schemaName, schemaDef });
          serverProxies[`schemas/${schemaName}-middleware`] = middlewareContent;
          serverProxies[`schemas/${schemaName}-sdl`] = sdlContent;
          serverProxies[`schemas/${schemaName}`] = schemaContent;
          break;
        }
        default:
          throw new Error(`Unsupported GraphQL schema type: ${(schemaDef as { type: unknown }).type}`);
      }
    }
    serverProxies["schema"] = await getStitchedSchemaProxy({ schemaNames: Object.keys(options.schemas) });

    // Setup Yoga middleware (server-only proxy)
    if (options.middleware) {
      const yogaMiddlewarePath = await findSingleFile(layerRootDirs, options.middleware, true);
      logger.info(`GraphQL Yoga middleware registered: ${cyan}${toRelativePath(nuxt.options.rootDir, yogaMiddlewarePath)}${reset}`);
      serverProxies["yoga-middleware"] = getYogaMiddlewareProxy(yogaMiddlewarePath);
    }
    else {
      serverProxies["yoga-middleware"] = getYogaMiddlewareProxy();
    }

    // Generate GraphQL SDL file
    const sdlPath = options.saveSdl ? join(rootDir, options.saveSdl) : join(buildDir, "graphql/schema.graphql");
    async function generateGraphQLSDL() {
      const schema = await loadGraphQLSchema(join(buildDir, "graphql/schema.ts"));
      const sdlContent = await getSDLFromGraphQLSchema(schema);
      if (writeFileIfChanged(sdlPath, sdlContent)) {
        logger.info(`GraphQL SDL generated: ${cyan}${toRelativePath(rootDir, sdlPath)}${reset}`);
      }
    }

    // Generate GraphQL Config file
    const configPath = join(rootDir, options.saveConfig || "graphql.config.json");
    const documents = options.documents || "**/*.gql";
    async function generateGraphQLConfig() {
      const configContent = JSON.stringify({ schema: toRelativePath(rootDir, sdlPath), documents }, null, 2);
      if (writeFileIfChanged(configPath, configContent)) {
        logger.info(`GraphQL Config generated: ${cyan}${toRelativePath(rootDir, configPath)}${reset}`);
      }
    }

    // Generate GraphQL operations / fragments and Zod schemas using GraphQL Codegen
    const typedDocumentsPath = join(buildDir, "graphql/typed-documents.ts");
    nuxt.options.alias["#graphql/typed-documents"] = typedDocumentsPath;
    const zodPath = join(buildDir, "graphql/zod.ts");
    nuxt.options.alias["#graphql/zod"] = zodPath;
    async function generateGraphQLCodegen() {
      try {
        const files = await runGraphQLCodegen({ schema: sdlPath, documents, typedDocumentsPath, zodPath });
        for (const file of files) {
          logger.info(`GraphQL Codegen generated: ${cyan}${toRelativePath(rootDir, file)}${reset}`);
        }
      }
      catch (error) {
        if (!nuxt.options.dev) {
          throw error;
        }
        const message = error instanceof AggregateError ? error.errors[0].message : String(error);
        logger.warn(message);
      }
    }

    // Generate GraphQL registry (operations and fragments registered by name and type)
    const registryPath = join(buildDir, "graphql/registry.ts");
    nuxt.options.alias["#graphql/registry"] = registryPath;
    async function generateGraphQLRegistry() {
      const registryContent = await getRegistryContent({ layerRootDirs, rootDir, documents });
      writeFileIfChanged(registryPath, registryContent);
    }

    // Generate all GraphQL artifacts (deduped)
    let artifactsPromise: Promise<void> | undefined;
    async function generateGraphQLArtifacts() {
      if (!artifactsPromise) {
        artifactsPromise = (async () => {
          await generateGraphQLSDL();
          await generateGraphQLConfig();
          await generateGraphQLCodegen();
          await generateGraphQLRegistry();
        })();
      }
      return artifactsPromise;
    }

    // Register GraphQL Yoga server handler
    addServerHandler({ route: "/api/graphql", handler: resolve("./runtime/server/api/yoga-handler") });
    nuxt.hook("listen", (_, { url }) => {
      logger.success(`GraphQL Yoga ready: ${cyan}${url.replace(/\/$/, "")}/api/graphql${reset}`);
    });

    // Register server utils
    addServerImportsDir(resolve("./runtime/server/utils"));

    // Register GraphQL client plugins
    addPlugin(resolve("./runtime/app/plugins/graphql-request"));
    addPlugin(resolve("./runtime/app/plugins/graphql-sse.client"));

    // Register composables
    addImportsDir(resolve("./runtime/app/composables"));

    // Save server-only proxy files and configure their aliases in Nitro
    nuxt.hook("nitro:config", async (nitroConfig) => {
      nitroConfig.alias ||= {};
      for (const [proxyName, proxyContent] of Object.entries(serverProxies)) {
        const proxyPath = join(buildDir, "graphql", `${proxyName}.ts`);
        nitroConfig.alias[`#graphql/${proxyName}`] = proxyPath;
        writeFileIfChanged(proxyPath, proxyContent);
      }
      await generateGraphQLArtifacts();
    });

    // Initialize Nuxt GraphQL during types preparation
    nuxt.hook("prepare:types", async ({ references }) => {
      // Generate GraphQL code artifacts
      await generateGraphQLArtifacts();

      // Add references to Nuxt types
      references.push({ path: registryPath });
      references.push({ path: typedDocumentsPath });
      references.push({ path: zodPath });
    });

    // Watch for changes in development mode
    if (nuxt.options.dev) {
      nuxt.hook("builder:watch", async (_event, path) => {
        // Regenerate some GraphQL artifacts on documents change
        if (path.endsWith(".gql")) {
          logger.info(`GraphQL document change detected: ${cyan}${toRelativePath(nuxt.options.rootDir, path)}${reset}`);
          await generateGraphQLCodegen();
          await generateGraphQLRegistry();
        }
      });
    }
  },
});
