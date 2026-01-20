import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { addImportsDir, addPlugin, addServerHandler, addServerImportsDir, addTemplate, createResolver, defineNuxtModule, useLogger } from "@nuxt/kit";
import type { GraphQLSchema } from "graphql";
import type { Source } from "@graphql-tools/utils";
import { hash } from "ohash";
import { cyan, reset } from "./lib/colors";
import { renderContextTemplate } from "./lib/context";
import { loadDocuments } from "./lib/documents";
import { renderFragmentsTemplate } from "./lib/fragments";
import { renderOperationsTemplate } from "./lib/operations";
import { renderRegistryTemplate } from "./lib/registry";
import { loadStitchedSchema, printSchemaSDL, renderLocalSchemaTemplate, renderRemoteSchemaTemplate, renderStitchedSchemaTemplate, type SchemaDef } from "./lib/schemas";
import { renderTypesTemplate } from "./lib/types";
import { resolveCacheConfig, type CacheConfig } from "./runtime/shared/lib/cache-config";

// Nuxt GraphQL module options
export interface NuxtGraphQLModuleOptions {
  /**
   * Client-side GraphQL configuration (HTTP + cache).
   */
  client?: {
    /**
     * Global cache configuration for queries.
     */
    cache?: Partial<CacheConfig>;

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

// Re-export definition helpers
export { defineGraphQLContext } from "./runtime/server/lib/context";
export { defineRemoteExecutorHooks } from "./runtime/server/lib/remote-executor";

// Nuxt GraphQL module
export default defineNuxtModule<NuxtGraphQLModuleOptions>({
  meta: {
    name: "nuxt-graphql",
    configKey: "graphql",
  },
  defaults: {},
  async setup(options, nuxt) {
    // #region Module helpers

    // Build-time logger
    const logger = useLogger("graphql");

    // Module runtime resolver
    const { resolve: resolveModule } = createResolver(import.meta.url);

    // Project rootDir resolver (for user paths)
    const { resolve: resolveRoot, resolvePath: _resolveRootPath } = createResolver(nuxt.options.rootDir);
    // Resolve a path relative to Nuxt rootDir.
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
    nuxt.options.alias["#graphql"] = resolve(nuxt.options.buildDir, "graphql");

    // Nitro aliases
    const nitroAlias: Record<string, string> = {};

    // #endregion

    // ─────────────────────────────────────────────────────────────
    // GraphQL definition from context / schemas / documents / types
    // ─────────────────────────────────────────────────────────────

    // #region GraphQL context

    // Generate context module
    const contextModules: string[] = [
      resolveModule("./runtime/server/lib/default-context"),
      ...await Promise.all((options.yoga?.context || []).map((path) => resolveRootPath(path, true))),
    ];
    const contextTemplate = addTemplate({
      filename: "graphql/context.ts",
      getContents: () => renderContextTemplate({ contextModules }),
      write: true,
    });
    nitroAlias["#graphql/context"] = contextTemplate.dst;

    // #endregion

    // #region GraphQL schema

    // Generate user schema(s) modules
    const schemaDefs: Record<string, SchemaDef> = {};
    for (const [schemaName, schemaDef] of Object.entries(options.yoga?.schemas || {})) {
      let schemaTemplate;
      if (schemaDef.type === "local") {
        const localSchemaDef = {
          ...schemaDef,
          path: await resolveRootPath(schemaDef.path, true),
        };
        schemaDefs[schemaName] = localSchemaDef;
        schemaTemplate = addTemplate({
          filename: `graphql/schemas/${schemaName}.ts`,
          getContents: async () => renderLocalSchemaTemplate({ ...localSchemaDef }),
          write: true,
        });
      }
      else if (schemaDef.type === "remote") {
        const remoteSchemaDef = {
          ...schemaDef,
          hooks: await Promise.all((schemaDef.hooks || []).map((hookPath) => resolveRootPath(hookPath, true))),
          remoteExecutorModule: resolveModule("./runtime/server/lib/remote-executor"),
        };
        schemaDefs[schemaName] = remoteSchemaDef;
        schemaTemplate = addTemplate({
          filename: `graphql/schemas/${schemaName}.ts`,
          getContents: async () => await renderRemoteSchemaTemplate({ ...remoteSchemaDef }),
          write: true,
        });
      }
      else {
        throw new Error(`Unknown schema type for schema "${schemaName}"`);
      }
      nitroAlias[`#graphql/schemas/${schemaName}`] = schemaTemplate.dst;
    }

    // Generate stitched schema module
    const schemaTemplate = addTemplate({
      filename: "graphql/schema.ts",
      getContents: () => renderStitchedSchemaTemplate({
        schemaNames: Object.keys(options.yoga?.schemas || {}),
      }),
      write: true,
    });
    nitroAlias["#graphql/schema"] = schemaTemplate.dst;

    // #endregion

    // #region Build cache

    type BuildCache<T> = { key: string; data: T };

    // Load GraphQL documents with a small build-time cache.
    let documentsCache: BuildCache<Source[]> | null = null;
    async function getDocuments(glob: string): Promise<Source[]> {
      const key = `documents:${glob}`;
      if (documentsCache?.key === key) return documentsCache.data;
      const documents = await loadDocuments(glob);
      documentsCache = { key, data: documents };
      return documents;
    }

    // Load or reuse a stitched schema and persist its SDL to disk.
    const sdlPath = resolveRoot(options.saveSDL || "server/graphql/schema.graphql");
    let schemaCache: BuildCache<GraphQLSchema> | null = null;
    async function getStitchedSchema(schemaDefs: Record<string, SchemaDef>): Promise<GraphQLSchema> {
      const key = `schema:${hash(schemaDefs)}`;
      if (schemaCache?.key === key) return schemaCache.data;
      const schema = await loadStitchedSchema(schemaDefs);
      schemaCache = { key, data: schema };

      // Save SDL to disk
      const sdl = await printSchemaSDL(schema);
      mkdirSync(dirname(sdlPath), { recursive: true });
      writeFileSync(sdlPath, sdl, { encoding: "utf-8" });
      logger.info(`GraphQL SDL saved to: ${cyan}${getRelativePath(sdlPath)}${reset}`);

      return schema;
    }

    // #endregion

    // #region GraphQL operations & registry

    // Generate operations module
    addTemplate({
      filename: "graphql/operations.ts",
      getContents: async () => await renderOperationsTemplate({
        schema: await getStitchedSchema(schemaDefs),
        documents: await getDocuments(options.client?.documents || "**/*.gql"),
      }),
      write: true,
    });

    // Generate fragments module
    addTemplate({
      filename: "graphql/fragments.ts",
      getContents: async () => await renderFragmentsTemplate({
        documents: await getDocuments(options.client?.documents || "**/*.gql"),
      }),
      write: true,
    });

    // Generate registry module
    addTemplate({
      filename: "graphql/registry.ts",
      getContents: async () => await renderRegistryTemplate({
        documents: await getDocuments(options.client?.documents || "**/*.gql"),
      }),
      write: true,
    });

    // #endregion

    // #region GraphQL artifacts

    // Save graphql.config.json
    const configPath = resolveRoot(options.saveConfig || "graphql.config.json");
    const config = { schema: getRelativePath(sdlPath), documents: options.client?.documents || "**/*.gql" };
    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(configPath, JSON.stringify(config, null, 2), { encoding: "utf-8" });
    logger.info(`GraphQL config saved to: ${cyan}${getRelativePath(configPath)}${reset}`);

    // #endregion

    // #region GraphQL types
    const typesTemplate = addTemplate({
      filename: "graphql/types.d.ts",
      getContents: () => renderTypesTemplate(),
      write: true,
    });

    // #endregion

    // ─────────────────────────────────────────────────────────────
    // Bootstrap & runtime integration
    // ─────────────────────────────────────────────────────────────

    // #region Runtime configuration

    // Expose module options to runtime
    nuxt.options.runtimeConfig.public.graphql = {
      cacheConfig: resolveCacheConfig(options.client?.cache),
      ssrForwardHeaders: options.client?.ssrForwardHeaders || ["authorization", "cookie"],
    };

    // #endregion

    // #region Runtime aliases

    // Register generated files
    nuxt.hook("prepare:types", ({ sharedReferences }) => {
      sharedReferences.push({ path: typesTemplate.dst });
      sharedReferences.push({ path: resolveModule("./runtime/shared/types/nuxt-graphql.d.ts") });
    });

    // Register Nitro aliases
    nuxt.hook("nitro:config", (nitroConfig) => {
      nitroConfig.alias ||= {};
      Object.assign(nitroConfig.alias, nitroAlias);
    });

    // #endregion

    // #region Watchers

    if (nuxt.options.dev) {
      nuxt.hook("builder:watch", async (_event, changedPath) => {
        if (changedPath.endsWith(".gql")) {
          logger.info(`Documents change detected: ${cyan}${getRelativePath(changedPath)}${reset}`);
          documentsCache = null;
        }
      });
    }

    // #endregion

    // #region Runtime integrations

    // GraphQL Yoga server endpoint
    addServerHandler({ route: "/api/graphql", handler: resolveModule("./runtime/server/api/graphql") });
    nuxt.hook("listen", (_, { url }) => {
      logger.success(`GraphQL Yoga ready: ${cyan}${url.replace(/\/$/, "")} / api / graphql${reset}`);
    });

    // GraphQL client plugins
    addPlugin(resolveModule("./runtime/app/plugins/graphql-request"));
    addPlugin(resolveModule("./runtime/app/plugins/graphql-sse.client"));

    // Composables and server utils
    addImportsDir(resolveModule("./runtime/app/composables"));
    addServerImportsDir(resolveModule("./runtime/server/utils"));

    // #endregion
  },
});
