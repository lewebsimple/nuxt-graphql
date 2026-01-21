import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { defu } from "defu";
import type { GraphQLSchema } from "graphql";
import { GraphQLFileLoader } from "@graphql-tools/graphql-file-loader";
import { loadDocuments } from "@graphql-tools/load";
import { stitchSchemas } from "@graphql-tools/stitch";
import type { Source } from "@graphql-tools/utils";
import { addImportsDir, addPlugin, addServerHandler, addServerImportsDir, addServerTemplate, addTemplate, addTypeTemplate, createResolver, defineNuxtModule, useLogger } from "@nuxt/kit";
import { cyan, reset } from "./lib/colors";
import { renderContextTemplate, renderContextTypesTemplate } from "./lib/context";
import { renderOperationsTemplate } from "./lib/operations";
import { renderRegistryTemplate } from "./lib/registry";
import { introspectRemoteSchema, loadLocalSchema, printSchemaSDL, renderLocalSchemaTemplate, renderRemoteSchemaTemplate, renderSchemaTemplate, renderSchemaTypesTemplate, type SchemaDef } from "./lib/schemas";
import { renderAppTypesTemplate, renderServerTypesTemplate, renderSharedTypesTemplate } from "./lib/types";
import { resolveCacheConfig } from "./runtime/shared/lib/cache";
import { hash } from "ohash";

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
   * Server-side GraphQL configuration (Yoga + execution).
   */
  yoga?: {
    /**
     * Paths to GraphQL context factories.
     * Must live in server/.
     * Resolved from rootDir.
     */
    context?: string[];

    /**
     * GraphQL schemas to stitch.
     * Key = schemaName.
     */
    schemas?: Record<string, SchemaDef>;
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
    // Module helpers
    // ────────────────────────────────────────────────────────────────────────────────

    // Build-time logger
    const logger = useLogger("graphql");

    // Build resolver
    const { resolve: resolveBuild } = createResolver(nuxt.options.buildDir);

    // Module runtime resolver
    const { resolve: resolveModule } = createResolver(import.meta.url);

    // Project rootDir resolver (user-provided paths)
    const { resolve: resolveRoot, resolvePath: _resolveRootPath } = createResolver(nuxt.options.rootDir);
    async function resolveRootPath(path: string | undefined, required: true): Promise<string>;
    async function resolveRootPath(path: string | undefined, required: false): Promise<string | undefined>;
    async function resolveRootPath(path: string | undefined, required: boolean = true) {
      try {
        if (!path) throw new Error("No path provided");
        const resolvedPath = await _resolveRootPath(path);
        return resolvedPath.replace(/\.(ts|mjs)$/u, "");
      }
      catch {
        if (required) throw new Error(`Cannot resolve path in rootDir: ${path}`);
        return undefined;
      }
    }

    // Convert an absolute path to a rootDir-relative path.
    function getRelativePath(to: string): string {
      let relativePath = relative(resolve(nuxt.options.rootDir), resolve(to));
      relativePath = relativePath.replace(/\\/g, "/");
      if (!relativePath.startsWith("./") && !relativePath.startsWith("../")) {
        relativePath = `./${relativePath}`;
      }
      return relativePath;
    }

    // Nuxt aliases
    nuxt.options.alias ||= {};
    nuxt.options.alias["#graphql"] ||= resolveBuild("graphql");

    // Build cache helpers
    type BuildCache<TData> = { key: string; data: TData };
    const buildCache = new Map<string, BuildCache<unknown>>();

    function cachedLoader<TData, TArgs extends unknown[] = []>(
      baseKey: string,
      loader: (...args: TArgs) => Promise<TData>,
    ) {
      return async (...args: TArgs): Promise<TData> => {
        const key = `${baseKey}:${hash(args)}`;
        const cached = buildCache.get(key);
        if (cached?.key === key) {
          return cached.data as TData;
        }
        const data = await loader(...args);
        buildCache.set(key, { key, data });
        return data;
      };
    }

    // ────────────────────────────────────────────────────────────────────────────────
    // GraphQL context
    // ────────────────────────────────────────────────────────────────────────────────

    const contextModules: string[] = await Promise.all((options.yoga?.context || []).map((path) => resolveRootPath(path, true)));
    addTemplate({ filename: "graphql/context.mjs", getContents: () => renderContextTemplate({ contextModules }), write: true });
    addTemplate({ filename: "graphql/context.d.ts", getContents: () => renderContextTypesTemplate({ contextModules }), write: true });
    addServerTemplate({ filename: "#graphql/context.mjs", getContents: () => renderContextTemplate({ contextModules }) });

    // ────────────────────────────────────────────────────────────────────────────────
    // GraphQL schemas
    // ────────────────────────────────────────────────────────────────────────────────

    const remoteExecutorModule = resolveModule("./runtime/server/lib/remote-executor");
    const schemaCachedLoaders: Record<string, () => Promise<GraphQLSchema>> = {};
    for (const [schemaName, schemaDef] of Object.entries(options.yoga?.schemas || {})) {
      if (schemaDef.type === "local") {
        const schemaModule = await resolveRootPath(schemaDef.path, true);
        schemaCachedLoaders[schemaName] = cachedLoader<GraphQLSchema>(`schema:local:${schemaName}`, async () => await loadLocalSchema({ schemaModule }));
        addTemplate({ filename: `graphql/schemas/${schemaName}.mjs`, getContents: async () => renderLocalSchemaTemplate({ schemaModule }), write: true });
        addServerTemplate({ filename: `#graphql/schemas/${schemaName}.mjs`, getContents: async () => renderLocalSchemaTemplate({ schemaModule }) });
      }
      else if (schemaDef.type === "remote") {
        schemaCachedLoaders[schemaName] = cachedLoader<GraphQLSchema>(`schema:remote:${schemaName}`, async () => await introspectRemoteSchema(schemaDef));
        const input = {
          remoteExecutorModule,
          hooksModules: await Promise.all((schemaDef.hooks || []).map((hookPath) => resolveRootPath(hookPath, true))),
          schemaDef,
          schemaLoader: schemaCachedLoaders[schemaName],
        };
        addTemplate({ filename: `graphql/schemas/${schemaName}.mjs`, getContents: async () => await renderRemoteSchemaTemplate(input), write: true });
        addServerTemplate({ filename: `#graphql/schemas/${schemaName}.mjs`, getContents: async () => await renderRemoteSchemaTemplate(input) });
      }
      else {
        throw new Error(`Unknown schema type for schema "${schemaName}"`);
      }
    }

    // ────────────────────────────────────────────────────────────────────────────────
    // GraphQL stitched schema
    // ────────────────────────────────────────────────────────────────────────────────

    const sdlPath = resolveRoot(options.saveSDL || "server/graphql/schema.graphql");
    const loadCachedSchema = cachedLoader<GraphQLSchema>("schema:stitched", async () => {
      const schema = stitchSchemas({
        subschemas: await Promise.all(Object.values(schemaCachedLoaders).map((loader) => loader())),
      });

      // Save stitched GraphQL SDL every time the schema is loaded
      const sdl = await printSchemaSDL(schema);
      mkdirSync(dirname(sdlPath), { recursive: true });
      writeFileSync(sdlPath, sdl, { encoding: "utf-8" });
      logger.info(`GraphQL SDL saved to: ${cyan}${getRelativePath(sdlPath)}${reset}`);

      return schema;
    });

    addTemplate({ filename: "graphql/schema.mjs", getContents: () => renderSchemaTemplate({ schemaNames: Object.keys(options.yoga?.schemas || {}) }), write: true });
    addTemplate({ filename: "graphql/schema.d.ts", getContents: () => renderSchemaTypesTemplate(), write: true });
    addServerTemplate({ filename: "#graphql/schema.mjs", getContents: () => renderSchemaTemplate({ schemaNames: Object.keys(options.yoga?.schemas || {}) }) });

    // ────────────────────────────────────────────────────────────────────────────
    // GraphQL operations
    // ────────────────────────────────────────────────────────────────────────────

    // Load documents with caching
    const loadCachedDocuments = cachedLoader<Source[], [string]>("documents", async (documentsGlob) => {
      try {
        return await loadDocuments([
          documentsGlob,
          "!**/.cache/**",
          "!**/.nuxt/**",
          "!**/.output/**",
          "!**/dist/**",
          "!**/node_modules/**",
        ], { loaders: [new GraphQLFileLoader()] });
      }
      catch {
        return [];
      }
    });

    // Generate operations module
    const loadCachedOperations = cachedLoader<{ module: string; types: string }, [string]>("operations", async (documentsGlob) => {
      const schema = await loadCachedSchema();
      const documents = await loadCachedDocuments(documentsGlob);
      return await renderOperationsTemplate({ schema, documents });
    });

    addTemplate({ filename: "graphql/operations.mjs", getContents: async () => (await loadCachedOperations(options.client?.documents || "**/*.gql")).module, write: true });
    addServerTemplate({ filename: "#graphql/operations.mjs", getContents: async () => (await loadCachedOperations(options.client?.documents || "**/*.gql")).module });
    addTemplate({ filename: "graphql/operations.d.ts", getContents: async () => (await loadCachedOperations(options.client?.documents || "**/*.gql")).types, write: true });

    // ────────────────────────────────────────────────────────────────────────────
    // GraphQL registry
    // ────────────────────────────────────────────────────────────────────────────

    const loadCachedRegistry = cachedLoader<{ module: string; types: string }, [string]>("registry", async (documentsGlob) => {
      const documents = await loadCachedDocuments(documentsGlob);
      return await renderRegistryTemplate({ documents });
    });

    // Generate registry module
    addTemplate({
      filename: "graphql/registry.mjs",
      getContents: async () => (await loadCachedRegistry(options.client?.documents || "**/*.gql")).module,
      write: true,
    });
    addServerTemplate({
      filename: "#graphql/registry.mjs",
      getContents: async () => (await loadCachedRegistry(options.client?.documents || "**/*.gql")).module,
    });
    addTemplate({
      filename: "graphql/registry.d.ts",
      getContents: async () => (await loadCachedRegistry(options.client?.documents || "**/*.gql")).types,
      write: true,
    });

    // ────────────────────────────────────────────────────────────────────────────
    // GraphQL config
    // ────────────────────────────────────────────────────────────────────────────

    const configPath = resolveRoot(options.saveConfig || "graphql.config.json");
    const config = { schema: getRelativePath(sdlPath), documents: options.client?.documents || "**/*.gql" };
    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(configPath, JSON.stringify(config, null, 2), { encoding: "utf-8" });
    logger.info(`GraphQL config saved to: ${cyan}${getRelativePath(configPath)}${reset}`);

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
          logger.info(`Documents change detected: ${cyan}${getRelativePath(changedPath)}${reset}`);
          buildCache.delete("documents");
          buildCache.delete("operations");
        }
      });
    }

    // ─────────────────────────────────────────────────────────────
    // GraphQL Yoga server endpoint
    // ─────────────────────────────────────────────────────────────

    addServerHandler({ route: "/api/graphql", handler: resolveModule("./runtime/server/api/graphql") });
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
