import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { defu } from "defu";
import type { GraphQLSchema } from "graphql";
import { hash } from "ohash";
import type { Source } from "@graphql-tools/utils";
import { stitchSchemas } from "@graphql-tools/stitch";
import { addImportsDir, addPlugin, addServerHandler, addServerImportsDir, addServerTemplate, addTemplate, addTypeTemplate, createResolver, defineNuxtModule, useLogger } from "@nuxt/kit";
import { cyan, reset } from "./lib/colors";
import { renderContextTemplate } from "./lib/context";
import { loadDocuments } from "./lib/documents";
import { renderFragmentsTemplate } from "./lib/fragments";
import { renderOperationsTemplate } from "./lib/operations";
import { renderRegistryTemplate } from "./lib/registry";
import { introspectRemoteSchema, loadLocalSchema, printSchemaSDL, renderLocalSchemaTemplate, renderRemoteSchemaTemplate, renderStitchedSchemaTemplate, type SchemaDef } from "./lib/schemas";
import { renderAppTypesTemplate, renderServerTypesTemplate, renderSharedTypesTemplate } from "./lib/types";
import { resolveCacheConfig } from "./runtime/shared/lib/cache";

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

    type BuildCache<T> = { key: string; data: T };

    // ────────────────────────────────────────────────────────────────────────────────
    // GraphQL context
    // ────────────────────────────────────────────────────────────────────────────────

    const contextModules: string[] = await Promise.all((options.yoga?.context || []).map((path) => resolveRootPath(path, true)));
    addTemplate({ filename: "graphql/context.mjs", getContents: () => renderContextTemplate({ contextModules }), write: true });
    addServerTemplate({ filename: "#graphql/context.mjs", getContents: () => renderContextTemplate({ contextModules }) });

    // ────────────────────────────────────────────────────────────────────────────────
    // GraphQL schemas
    // ────────────────────────────────────────────────────────────────────────────────

    // Cached schema loader
    const schemasCache = new Map<string, BuildCache<GraphQLSchema> | null>([]);
    function cachedSchemaLoader(schemaDef: SchemaDef | { type: "stitched" }, loader: () => Promise<GraphQLSchema>) {
      return async () => {
        const key = `schemaDef:${hash(schemaDef)}`;
        const cached = schemasCache.get(key);
        if (cached?.key === key) return cached.data;
        const schema = await loader();
        schemasCache.set(key, { key, data: schema });
        return schema;
      };
    }

    // Resolve schema definitions / loaders
    const remoteExecutorModule = resolveModule("./runtime/server/lib/remote-executor");
    const schemaLoaders: Record<string, () => Promise<GraphQLSchema>> = {};
    for (const [schemaName, schemaDef] of Object.entries(options.yoga?.schemas || {})) {
      if (schemaDef.type === "local") {
        const schemaModule = await resolveRootPath(schemaDef.path, true);
        schemaLoaders[schemaName] = cachedSchemaLoader(schemaDef, async () => await loadLocalSchema({ schemaModule }));
        addTemplate({ filename: `graphql/schemas/${schemaName}.mjs`, getContents: async () => renderLocalSchemaTemplate({ schemaModule }), write: true });
        addServerTemplate({ filename: `#graphql/schemas/${schemaName}.mjs`, getContents: async () => renderLocalSchemaTemplate({ schemaModule }) });
      }
      else if (schemaDef.type === "remote") {
        schemaLoaders[schemaName] = cachedSchemaLoader(schemaDef, async () => await introspectRemoteSchema(schemaDef));
        const input = {
          remoteExecutorModule,
          hooksModules: await Promise.all((schemaDef.hooks || []).map((hookPath) => resolveRootPath(hookPath, true))),
          schemaDef,
          schemaLoader: schemaLoaders[schemaName],
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
    const loadStitchedSchema = cachedSchemaLoader({ type: "stitched" }, async () => {
      const schema = stitchSchemas({
        subschemas: await Promise.all(Object.values(schemaLoaders).map((loader) => loader())),
      });

      // Save stitched GraphQL SDL every time the schema is loaded
      const sdl = await printSchemaSDL(schema);
      mkdirSync(dirname(sdlPath), { recursive: true });
      writeFileSync(sdlPath, sdl, { encoding: "utf-8" });
      logger.info(`GraphQL SDL saved to: ${cyan}${getRelativePath(sdlPath)}${reset}`);

      return schema;
    });
    addTemplate({ filename: "graphql/schema.mjs", getContents: () => renderStitchedSchemaTemplate({ schemaNames: Object.keys(options.yoga?.schemas || {}) }), write: true });
    addServerTemplate({ filename: "#graphql/schema.mjs", getContents: () => renderStitchedSchemaTemplate({ schemaNames: Object.keys(options.yoga?.schemas || {}) }) });

    // ────────────────────────────────────────────────────────────────────────────
    // GraphQL operations, fragments & registry
    // ────────────────────────────────────────────────────────────────────────────

    const documentsGlob = options.client?.documents || "**/*.gql";

    // Documents cache
    let documentsCache: BuildCache<Source[]> | null = null;
    async function loadDocumentsCached(glob: string): Promise<Source[]> {
      const key = `documents:${glob}`;
      if (documentsCache?.key === key) return documentsCache.data;
      const documents = await loadDocuments(glob);
      documentsCache = { key, data: documents };
      return documents;
    }

    // Generate operations module
    addTemplate({
      filename: "graphql/operations.ts",
      getContents: async () => await renderOperationsTemplate({
        schema: await loadStitchedSchema(),
        documents: await loadDocumentsCached(documentsGlob),
      }),
      write: true,
    });

    // Generate fragments module
    addTemplate({
      filename: "graphql/fragments.ts",
      getContents: async () => await renderFragmentsTemplate({
        documents: await loadDocumentsCached(documentsGlob),
      }),
      write: true,
    });

    // Generate registry module
    addTemplate({
      filename: "graphql/registry.ts",
      getContents: async () => await renderRegistryTemplate({
        documents: await loadDocumentsCached(documentsGlob),
      }),
      write: true,
    });

    // ────────────────────────────────────────────────────────────────────────────
    // GraphQL config
    // ────────────────────────────────────────────────────────────────────────────

    const configPath = resolveRoot(options.saveConfig || "graphql.config.json");
    const config = { schema: getRelativePath(sdlPath), documents: documentsGlob };
    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(configPath, JSON.stringify(config, null, 2), { encoding: "utf-8" });
    logger.info(`GraphQL config saved to: ${cyan}${getRelativePath(configPath)}${reset}`);

    // ────────────────────────────────────────────────────────────────────────────
    // Types injection
    // ────────────────────────────────────────────────────────────────────────────

    addTypeTemplate({ filename: "types/nuxt-graphql.app.d.ts", getContents: () => renderAppTypesTemplate() }, { nuxt: true });
    addTypeTemplate({ filename: "types/nuxt-graphql.server.d.ts", getContents: () => renderServerTypesTemplate({ contextModules }) }, { nitro: true });
    addTypeTemplate({ filename: "types/nuxt-graphql.shared.d.ts", getContents: () => renderSharedTypesTemplate() }, { nuxt: true, nitro: true });

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
          documentsCache = null;
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
