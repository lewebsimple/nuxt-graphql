import { addImportsDir, addPlugin, addServerHandler, addServerImportsDir, createResolver, defineNuxtModule, getLayerDirectories } from "@nuxt/kit";
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { findSingleFile, findMultipleFiles, writeFileIfChanged } from "./helpers/file-operations";
import { analyzeGraphQLDocuments, formatDefinitions, generateRegistryByTypeSource, loadGraphQLSchema, runCodegen } from "./helpers/codegen";
import { logger, cyan, reset } from "./helpers/logger";
import { GRAPHQL_ENDPOINT } from "./runtime/server/graphql/constants";
import type { GraphQLCacheConfig } from "./runtime/app/utils/graphql-cache";
import type { CodegenConfig } from "@graphql-codegen/cli";

// Module configuration options
export interface ModuleOptions {
  headers?: Record<string, string>;
  cache?: Partial<GraphQLCacheConfig>;
  codegen?: {
    pattern?: string;
    schemaOutput?: string;
    scalars?: Record<string, string | { input: string; output: string }>;
    generates?: CodegenConfig["generates"];
  };
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "@lewebsimple/nuxt-graphql",
    configKey: "graphql",
  },
  defaults: {
    codegen: {
      pattern: "**/*.gql",
      schemaOutput: "server/graphql/schema.graphql",
    },
  },
  async setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url);

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

    // Resolve code generation paths
    const codegenPattern = options.codegen?.pattern ?? "**/*.gql";
    const graphqlrcFile = join(rootDir, ".graphqlrc");

    // Resolve generated files and aliases
    const operationsFile = join(nuxt.options.buildDir, "graphql/operations.ts");
    const registryFile = join(nuxt.options.buildDir, "graphql/registry.ts");
    const zodSchemasFile = join(nuxt.options.buildDir, "graphql/zod.ts");

    // Resolve schema output path and validate extension
    const schemaOutput = options.codegen?.schemaOutput ?? "server/graphql/schema.graphql";
    if (schemaOutput && !schemaOutput.endsWith(".graphql")) {
      logger.warn(`Schema output '${schemaOutput}' should have .graphql extension.`);
    }
    const schemaFile = join(rootDir, schemaOutput);

    const setupAliases = () => {
      nuxt.hook("nitro:config", (config) => {
        config.alias ||= {};
        config.alias["#graphql/schema"] = schemaPath;
        config.alias["#graphql/context"] = contextPath;
      });

      nuxt.options.alias["#graphql/operations"] = operationsFile;
      nuxt.options.alias["#graphql/registry"] = registryFile;
      nuxt.options.alias["#graphql/zod"] = zodSchemasFile;
    };

    const setupHandler = () => {
      addServerHandler({ route: GRAPHQL_ENDPOINT, handler: resolve("./runtime/server/api/graphql-handler") });
      nuxt.hook("listen", (_, { url }) => {
        logger.success(`GraphQL Yoga ready at ${cyan}${url.replace(/\/$/, "")}${GRAPHQL_ENDPOINT}${reset}`);
      });
    };

    const setupRuntimeConfig = () => {
      nuxt.options.runtimeConfig.public.graphql = {
        endpoint: GRAPHQL_ENDPOINT,
        headers: options.headers || {},
        cache: {
          enabled: options.cache?.enabled ?? false,
          ttl: options.cache?.ttl ?? 60000,
          storage: options.cache?.storage ?? "memory",
        },
      };
    };

    const setupCodegen = () => {
      const generate = async () => {
        const [schema, documents] = await Promise.all([
          loadGraphQLSchema(schemaPath),
          findMultipleFiles(layerRootDirs, codegenPattern),
        ]);

        const docs = documents.map((document) => ({ path: document, content: readFileSync(document, "utf-8") }));
        const analysis = analyzeGraphQLDocuments(docs);

        for (const doc of docs) {
          const relativePath = doc.path.startsWith(rootDir) ? doc.path.slice(rootDir.length + 1) : doc.path;
          const defs = analysis.byFile.get(doc.path) ?? [];
          logger.info(`${cyan}${relativePath}${reset} [${formatDefinitions(defs)}]`);
        }

        await runCodegen({
          schema,
          documents,
          operationsFile,
          schemasFile: zodSchemasFile,
          scalars: options.codegen?.scalars,
          generates: options.codegen?.generates,
        });

        if (writeFileIfChanged(schemaFile, schema)) {
          logger.info(`GraphQL schema saved to ${cyan}${schemaOutput}${reset}`);
        }

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

        if (writeFileIfChanged(registryFile, generateRegistryByTypeSource(analysis.operationsByType))) {
          logger.info(`GraphQL registry saved to ${cyan}${relative(rootDir, registryFile)}${reset}`);
        }
      };

      nuxt.hook("prepare:types", async ({ references }) => {
        await generate();
        if (existsSync(operationsFile)) references.push({ path: operationsFile });
        if (existsSync(registryFile)) references.push({ path: registryFile });
        if (existsSync(zodSchemasFile)) references.push({ path: zodSchemasFile });
      });

      if (nuxt.options.dev) {
        nuxt.hook("builder:watch", async (event, path) => {
          if (path.endsWith(".gql")) {
            await generate();
          }
        });
      }
    };

    const setupAppRuntime = () => {
      addImportsDir(resolve("./runtime/app/composables"));
      addServerImportsDir(resolve("./runtime/server/utils"));
      addPlugin(resolve("./runtime/app/plugins/graphql"));
    };

    setupAliases();
    setupHandler();
    setupRuntimeConfig();
    setupCodegen();
    setupAppRuntime();
  },
});
