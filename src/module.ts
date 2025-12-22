import { addImportsDir, addPlugin, addServerHandler, addServerImportsDir, addServerTemplate, addTypeTemplate, createResolver, defineNuxtModule, getLayerDirectories } from "@nuxt/kit";
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { findSingleFile, findMultipleFiles, writeFileIfChanged } from "./utils/file-operations";
import { analyzeGraphQLDocuments, formatDefinitions, generateRegistryByTypeSource, loadGraphQLSchema, runCodegen } from "./utils/codegen";
import { logger, cyan, reset } from "./utils/logger";
import type { GraphQLCacheConfig } from "./runtime/utils/graphql-cache";

export interface ModuleOptions {
  endpoint?: string;
  headers?: Record<string, string>;
  cache?: Partial<GraphQLCacheConfig>;
  codegen?: {
    pattern?: string;
    schemaOutput?: string;
    scalars?: Record<string, string>;
  };
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "@lewebsimple/nuxt-graphql",
    configKey: "graphql",
  },
  defaults: {
    endpoint: "/api/graphql",
    codegen: {
      pattern: "**/*.gql",
      schemaOutput: "server/graphql/schema.graphql",
    },
  },
  async setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url);

    // Validate configuration options
    if (options.endpoint) {
      if (!options.endpoint.startsWith("/")) {
        logger.warn("GraphQL endpoint should start with '/' (e.g., '/api/graphql')");
      }
    }

    // Layer directories
    const { rootDir, serverDir } = nuxt.options;
    const layerDirs = [
      ...getLayerDirectories(nuxt),
      { root: rootDir, server: serverDir.replace(rootDir, `${rootDir}/playground`) },
    ];
    const layerServerDirs = layerDirs.map(({ server }) => server);
    const layerRootDirs = layerDirs.map(({ root }) => root);

    // Resolve server files across layers
    const schemaPath = await findSingleFile(layerServerDirs, "graphql/schema.{ts,mjs}", true);
    const contextPath = (await findSingleFile(layerServerDirs, "graphql/context.{ts,mjs}")) || resolve("./runtime/server/graphql/default-context.ts");

    // Nitro aliases
    nuxt.hook("nitro:config", (config) => {
      config.alias ||= {};
      config.alias["#graphql/schema"] = schemaPath;
      config.alias["#graphql/context"] = contextPath;
    });

    // Yoga handler
    const endpoint = options.endpoint ?? "/api/graphql";
    addServerTemplate({
      filename: "graphql/yoga-handler",
      getContents: () => readFileSync(resolve("./templates/yoga-handler.mjs"), "utf-8").replace("{{endpoint}}", endpoint),
    });
    addServerHandler({ route: endpoint, handler: "graphql/yoga-handler" });
    nuxt.hook("listen", (_, { url }) => {
      logger.success(`GraphQL Yoga ready at ${cyan}${url.replace(/\/$/, "")}${endpoint}${reset}`);
    });

    // Runtime config
    nuxt.options.runtimeConfig.public.graphql = {
      endpoint,
      headers: options.headers || {},
      cache: {
        enabled: options.cache?.enabled ?? false,
        ttl: options.cache?.ttl ?? 60000,
        storage: options.cache?.storage ?? "memory",
      },
    };

    // GraphQL codegen / config
    const codegenPattern = options.codegen?.pattern ?? "**/*.gql";
    const graphqlrcFile = join(rootDir, ".graphqlrc");

    // GraphQL operations & registry
    const operationsFile = join(nuxt.options.buildDir, "graphql/operations.ts");
    const registryFile = join(nuxt.options.buildDir, "graphql/registry.ts");
    nuxt.options.alias["#graphql/operations"] = operationsFile;
    nuxt.options.alias["#graphql/registry"] = registryFile;

    // GraphQL schema file
    const schemaOutput = options.codegen?.schemaOutput ?? "server/graphql/schema.graphql";
    if (schemaOutput) {
      if (!schemaOutput.endsWith(".graphql")) {
        logger.warn(`Schema output '${schemaOutput}' should have .graphql extension.`);
      }
    }
    const schemaFile = join(rootDir, schemaOutput);

    // GraphQL codegen wrapper
    const generate = async () => {
      // Load GraphQL schema and documents
      const [sdl, documents] = await Promise.all([
        loadGraphQLSchema(schemaPath),
        findMultipleFiles(layerRootDirs, codegenPattern),
      ]);

      // Analyze once, used by logging and registry
      const docs = documents.map((document) => ({ path: document, content: readFileSync(document, "utf-8") }));
      const analysis = analyzeGraphQLDocuments(docs);

      // Log detected documents with colored operation/fragment names
      for (const doc of docs) {
        const relativePath = doc.path.startsWith(rootDir) ? doc.path.slice(rootDir.length + 1) : doc.path;
        const defs = analysis.byFile.get(doc.path) ?? [];
        logger.info(`${cyan}${relativePath}${reset} [${formatDefinitions(defs)}]`);
      }

      // Generate TypedDocumentNode exports
      await runCodegen({ sdl, documents, operationsFile, scalars: options.codegen?.scalars });

      // Save GraphQL schema
      if (writeFileIfChanged(schemaFile, sdl)) {
        logger.info(`GraphQL schema saved to ${cyan}${schemaOutput}${reset}`);
      }

      // Save GraphQL config
      const graphqlrc: Record<string, unknown> = {
        schema: relative(rootDir, schemaFile),
        documents: codegenPattern,
      };
      if (options.codegen?.scalars) {
        graphqlrc.scalars = options.codegen.scalars;
      }
      if (writeFileIfChanged(graphqlrcFile, JSON.stringify(graphqlrc, null, 2))) {
        logger.info(`GraphQL config saved to ${cyan}.graphqlrc${reset}`);
      }

      // Save GraphQL registry (by operation type)
      if (writeFileIfChanged(registryFile, generateRegistryByTypeSource(analysis.operationsByType))) {
        logger.info(`GraphQL registry saved to ${cyan}${relative(rootDir, registryFile)}${reset}`);
      }
    };

    // Generate once on prepare
    nuxt.hook("prepare:types", async ({ references }) => {
      await generate();
      if (existsSync(operationsFile)) references.push({ path: operationsFile });
      if (existsSync(registryFile)) references.push({ path: registryFile });
    });

    // Watch in dev
    if (nuxt.options.dev) {
      nuxt.hook("builder:watch", async (event, path) => {
        if (path.endsWith(".gql")) {
          await generate();
        }
      });
    }

    // GraphQL client
    addImportsDir(resolve("./runtime/composables"));
    addServerImportsDir(resolve("./runtime/server/utils"));
    addPlugin(resolve("./runtime/plugins/graphql"));
    addTypeTemplate({
      filename: "types/graphql-client.d.ts",
      getContents: () => readFileSync(resolve("./runtime/types/graphql-client.d.ts"), "utf-8"),
    });
    nuxt.hook("prepare:types", ({ references }) => {
      references.push({ path: "./types/graphql-client.d.ts" });
    });
  },
});
