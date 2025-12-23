import { addImportsDir, addPlugin, addServerHandler, addServerImportsDir, addServerTemplate, addTypeTemplate, createResolver, defineNuxtModule, getLayerDirectories } from "@nuxt/kit";
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { findSingleFile, findMultipleFiles, writeFileIfChanged } from "./utils/file-operations";
import { analyzeGraphQLDocuments, formatDefinitions, generateRegistryByTypeSource, loadGraphQLSchema, runCodegen } from "./utils/codegen";
import { logger, cyan, reset } from "./utils/logger";
import type { GraphQLCacheConfig } from "./runtime/utils/graphql-cache";

// Module configuration options
export interface ModuleOptions {
  endpoint?: string;
  headers?: Record<string, string>;
  cache?: Partial<GraphQLCacheConfig>;
  codegen?: {
    pattern?: string;
    schemaOutput?: string;
    scalars?: Record<string, string | { input: string; output: string }>;
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

    // Validate configuration
    if (options.endpoint) {
      if (!options.endpoint.startsWith("/")) {
        logger.warn("GraphQL endpoint should start with '/' (e.g., '/api/graphql')");
      }
    }

    // Resolve layer directories
    const { rootDir, serverDir } = nuxt.options;
    const layerDirs = [
      ...getLayerDirectories(nuxt),
      { root: rootDir, server: serverDir.replace(rootDir, `${rootDir}/playground`) },
    ];
    const layerServerDirs = layerDirs.map(({ server }) => server);
    const layerRootDirs = layerDirs.map(({ root }) => root);

    // Resolve GraphQL schema and context files
    const schemaPath = await findSingleFile(layerServerDirs, "graphql/schema.{ts,mjs}", true);
    const contextPath = (await findSingleFile(layerServerDirs, "graphql/context.{ts,mjs}")) || resolve("./runtime/server/graphql/default-context.ts");

    // Configure Nitro aliases for GraphQL files
    nuxt.hook("nitro:config", (config) => {
      config.alias ||= {};
      config.alias["#graphql/schema"] = schemaPath;
      config.alias["#graphql/context"] = contextPath;
    });

    // Setup GraphQL Yoga handler
    const endpoint = options.endpoint ?? "/api/graphql";
    addServerTemplate({
      filename: "graphql/yoga-handler",
      getContents: () => readFileSync(resolve("./templates/yoga-handler.mjs"), "utf-8").replace("{{endpoint}}", endpoint),
    });
    addServerHandler({ route: endpoint, handler: "graphql/yoga-handler" });

    nuxt.hook("listen", (_, { url }) => {
      logger.success(`GraphQL Yoga ready at ${cyan}${url.replace(/\/$/, "")}${endpoint}${reset}`);
    });

    // Configure runtime settings
    nuxt.options.runtimeConfig.public.graphql = {
      endpoint,
      headers: options.headers || {},
      cache: {
        enabled: options.cache?.enabled ?? false,
        ttl: options.cache?.ttl ?? 60000,
        storage: options.cache?.storage ?? "memory",
      },
    };

    // Configure code generation paths
    const codegenPattern = options.codegen?.pattern ?? "**/*.gql";
    const graphqlrcFile = join(rootDir, ".graphqlrc");

    // Setup generated files and aliases
    const operationsFile = join(nuxt.options.buildDir, "graphql/operations.ts");
    const registryFile = join(nuxt.options.buildDir, "graphql/registry.ts");
    const schemasFile = join(nuxt.options.buildDir, "graphql/schemas.ts");

    nuxt.options.alias["#graphql/operations"] = operationsFile;
    nuxt.options.alias["#graphql/registry"] = registryFile;
    nuxt.options.alias["#graphql/schemas"] = schemasFile;

    // Configure schema output file
    const schemaOutput = options.codegen?.schemaOutput ?? "server/graphql/schema.graphql";
    if (schemaOutput && !schemaOutput.endsWith(".graphql")) {
      logger.warn(`Schema output '${schemaOutput}' should have .graphql extension.`);
    }
    const schemaFile = join(rootDir, schemaOutput);

    // Code generation function
    const generate = async () => {
      // Load schema and find all GraphQL document files
      const [sdl, documents] = await Promise.all([
        loadGraphQLSchema(schemaPath),
        findMultipleFiles(layerRootDirs, codegenPattern),
      ]);

      // Analyze documents for operations and fragments
      const docs = documents.map((document) => ({ path: document, content: readFileSync(document, "utf-8") }));
      const analysis = analyzeGraphQLDocuments(docs);

      // Log detected documents with colored operation/fragment names
      for (const doc of docs) {
        const relativePath = doc.path.startsWith(rootDir) ? doc.path.slice(rootDir.length + 1) : doc.path;
        const defs = analysis.byFile.get(doc.path) ?? [];
        logger.info(`${cyan}${relativePath}${reset} [${formatDefinitions(defs)}]`);
      }

      // Generate TypedDocumentNode exports and Zod schemas
      await runCodegen({
        sdl,
        documents,
        operationsFile,
        schemasFile,
        scalars: options.codegen?.scalars,
      });

      // Save GraphQL schema to file
      if (writeFileIfChanged(schemaFile, sdl)) {
        logger.info(`GraphQL schema saved to ${cyan}${schemaOutput}${reset}`);
      }

      // Save GraphQL configuration for IDE support
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

      // Save GraphQL registry with typed operations
      if (writeFileIfChanged(registryFile, generateRegistryByTypeSource(analysis.operationsByType))) {
        logger.info(`GraphQL registry saved to ${cyan}${relative(rootDir, registryFile)}${reset}`);
      }
    };

    // Generate types on prepare
    nuxt.hook("prepare:types", async ({ references }) => {
      await generate();

      if (existsSync(operationsFile)) references.push({ path: operationsFile });
      if (existsSync(registryFile)) references.push({ path: registryFile });
      if (existsSync(schemasFile)) references.push({ path: schemasFile });
    });

    // Watch for changes in development mode
    if (nuxt.options.dev) {
      nuxt.hook("builder:watch", async (event, path) => {
        if (path.endsWith(".gql")) {
          await generate();
        }
      });
    }

    // Setup GraphQL client composables and plugins
    addImportsDir(resolve("./runtime/composables"));
    addServerImportsDir(resolve("./runtime/server/utils"));
    addPlugin(resolve("./runtime/plugins/graphql"));

    // Add GraphQL client type definitions
    addTypeTemplate({
      filename: "types/graphql-client.d.ts",
      getContents: () => readFileSync(resolve("./runtime/types/graphql-client.d.ts"), "utf-8"),
    });

    nuxt.hook("prepare:types", ({ references }) => {
      references.push({ path: "./types/graphql-client.d.ts" });
    });
  },
});
