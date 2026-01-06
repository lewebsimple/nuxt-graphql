import { addImportsDir, addPlugin, addServerHandler, addServerImportsDir, createResolver, defineNuxtModule, getLayerDirectories } from "@nuxt/kit";
import { join, relative } from "node:path";
import { findSingleFile, findMultipleFiles, writeFileIfChanged } from "./helpers/file-operations";
import { analyzeDocuments, formatDefinitions, loadSchemaSdl, runCodegen, writeRegistryModule } from "./helpers/codegen";
import { logger, cyan, blue, magenta, reset } from "./helpers/logger";
import { writeLocalSchemaModule, writeRemoteSchemaModule, writeRemoteSchemaSdl, writeStitchedSchemaModule, type SchemaDefinition } from "./helpers/schemas";
import { GRAPHQL_ENDPOINT } from "./runtime/server/lib/constants";
import type { GraphQLCacheConfig } from "./runtime/app/utils/graphql-cache";

// Module configuration options
export interface ModuleOptions {
  context?: string;
  schemas: Record<string, SchemaDefinition>;
  codegen?: {
    documents?: string;
    saveSchema?: string;
    scalars?: Record<string, string | { input: string; output: string }>;
  };
  client?: {
    cache?: Partial<GraphQLCacheConfig>;
    headers?: Record<string, string>;
  };
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "@lewebsimple/nuxt-graphql",
    configKey: "graphql",
  },
  defaults: {
    schemas: {},
    codegen: {
      documents: "**/*.gql",
      saveSchema: "server/graphql/schema.graphql",
    },
    client: {
      headers: {},
      cache: {
        enabled: false,
        ttl: 60000,
        storage: "memory",
      },
    },
  },
  async setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url);

    const layerRootDirs = getLayerDirectories(nuxt).map(({ root }) => root);

    const stitchedPath = join(nuxt.options.buildDir, "graphql/schema.ts");
    const sdlPath = join(nuxt.options.rootDir, options.codegen?.saveSchema || ".nuxt/graphql/schema.graphql");

    nuxt.options.alias ||= {};

    if (!Object.keys(options.schemas || {}).length) {
      throw new Error("No GraphQL schemas configured. Please set 'graphql.schemas' with at least one local or remote schema.");
    }

    // Setup GraphQL context and schemas (writes proxy modules and stitched schema)
    async function setupContextSchemas() {
      // GraphQL context
      let contextPath: string;
      if (options.context) {
        contextPath = await findSingleFile(layerRootDirs, options.context, true);
        logger.info(`Using GraphQL context from ${cyan}${relative(nuxt.options.rootDir, contextPath)}${reset}`);
      }
      else {
        contextPath = resolve("./runtime/server/graphql/context");
        logger.info(`Using default GraphQL context`);
      }

      // GraphQL schemas (write proxies under .nuxt)
      const schemasPath: Record<string, string> = {};
      for (const [name, schemaDef] of Object.entries(options.schemas)) {
        schemasPath[name] = join(nuxt.options.buildDir, `graphql/schemas/${name}.ts`);
        if (schemaDef.type === "local") {
          // Local GraphQL schema
          const localPath = await findSingleFile(layerRootDirs, schemaDef.path, true);
          writeLocalSchemaModule(localPath, schemasPath[name]);
          logger.info(`Local GraphQL schema "${blue}${name}${reset}" loaded from ${cyan}${relative(nuxt.options.rootDir, localPath)}${reset}`);
        }
        else if (schemaDef.type === "remote") {
          // Remote GraphQL schema
          const remoteSdlPath = join(nuxt.options.buildDir, `graphql/schemas/${name}-sdl.ts`);
          await writeRemoteSchemaSdl(schemaDef, remoteSdlPath);
          writeRemoteSchemaModule(schemaDef, remoteSdlPath, schemasPath[name]);
          logger.info(`Remote GraphQL schema "${magenta}${name}${reset}" loaded from ${cyan}${schemaDef.url}${reset}`);
        }
        else {
          throw new Error(`Unknown schema type for schema '${name}'`);
        }
      }

      // Stitched GraphQL schema (combines all per-source proxies)
      writeStitchedSchemaModule(Object.keys(options.schemas), stitchedPath);

      nuxt.hook("nitro:config", (config) => {
        config.alias ||= {};
        config.alias["#graphql/context"] = contextPath;
        for (const name of Object.keys(options.schemas)) {
          config.alias[`#graphql/schemas/${name}`] = schemasPath[name];
        }
        config.alias["#graphql/schema"] = stitchedPath;
      });
    }

    // Setup GraphQL codegen
    async function setupCodegen() {
      const configPath = join(nuxt.options.rootDir, ".graphqlrc");
      const operationsPath = nuxt.options.alias["#graphql/operations"] = join(nuxt.options.buildDir, "graphql/operations.ts");
      const registryPath = nuxt.options.alias["#graphql/registry"] = join(nuxt.options.buildDir, "graphql/registry.ts");
      const zodPath = nuxt.options.alias["#graphql/zod"] = join(nuxt.options.buildDir, "graphql/zod.ts");

      async function generate() {
        try {
          // Write GraphQL schema SDL
          const sdlContent = await loadSchemaSdl(stitchedPath);
          writeFileIfChanged(sdlPath, sdlContent);

          // Find GraphQL documents
          const documentsPattern = options.codegen?.documents ?? "**/*.gql";
          const documents = await findMultipleFiles(layerRootDirs, documentsPattern);

          // Generate operations and Zod schemas using GraphQL Codegen
          await runCodegen({ schema: sdlPath, documents, operationsPath, zodPath, scalars: options.codegen?.scalars });

          // Write operations registry
          const analysis = analyzeDocuments(documents);
          analysis.byFile.forEach((defs, path) => {
            const relativePath = relative(nuxt.options.rootDir, path);
            logger.info(`${cyan}${relativePath}${reset} [${formatDefinitions(defs)}]`);
          });
          writeRegistryModule(registryPath, analysis);

          // Write GraphQL config to .graphqlrc
          const config = {
            schema: relative(nuxt.options.rootDir, sdlPath),
            documents: documentsPattern,
          };
          writeFileIfChanged(configPath, JSON.stringify(config, null, 2));
        }
        catch (error) {
          logger.warn(`GraphQL codegen failed: ${(error as Error).message}`);
        }
      }

      // Initial generation
      nuxt.hook("prepare:types", async ({ references }) => {
        await generate();
        // Ensure TS sees generated artifacts during prepare
        references.push({ path: operationsPath });
        references.push({ path: registryPath });
        references.push({ path: zodPath });
      });

      // Watch for changes in development mode
      if (nuxt.options.dev) {
        nuxt.hook("builder:watch", async (event, path) => {
          if (path.endsWith(".gql")) {
            await generate();
          }
        });
      }
    }

    // Setup GraphQL Yoga handler
    function setupYogaHandler() {
      addServerHandler({ route: GRAPHQL_ENDPOINT, handler: resolve("./runtime/server/api/graphql-handler") });
      nuxt.hook("listen", (_, { url }) => {
        logger.success(`GraphQL Yoga ready at ${cyan}${url.replace(/\/$/, "")}${GRAPHQL_ENDPOINT}${reset}`);
      });
    }

    // Setup GraphQL client
    function setupClient() {
      nuxt.options.runtimeConfig.public.graphql = {
        endpoint: GRAPHQL_ENDPOINT,
        headers: options.client?.headers || {},
        cache: {
          enabled: options.client?.cache?.enabled ?? false,
          ttl: options.client?.cache?.ttl ?? 60000,
          storage: options.client?.cache?.storage ?? "memory",
        },
      };
      addPlugin(resolve("./runtime/app/plugins/graphql"));
      addImportsDir(resolve("./runtime/app/composables"));
      addServerImportsDir(resolve("./runtime/server/utils"));
    }

    await setupContextSchemas();
    await setupCodegen();
    setupYogaHandler();
    setupClient();
  },
});
