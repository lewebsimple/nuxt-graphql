import { createResolver } from "@nuxt/kit";
import type { Nuxt } from "@nuxt/schema";
import {
  GraphQLSchema,
  buildClientSchema,
  getIntrospectionQuery,
  lexicographicSortSchema,
  printSchema,
  type IntrospectionQuery,
} from "graphql";

// ────────────────────────────────────────────────────────────────────────────────
// Schema definition (local / remote)
// ────────────────────────────────────────────────────────────────────────────────

/** Local schema definition. */
export type LocalSchemaDef = {
  /** Schema source type. */
  type: "local";
  /** Path to a module exporting `schema`. */
  path: string;
};

/** Remote schema definition. */
export type RemoteSchemaDef = {
  /** Schema source type. */
  type: "remote";
  /** Remote GraphQL endpoint URL. */
  endpoint: string;
  /** Static headers for introspection and execution. */
  headers?: Record<string, string>;
  /** Hook module paths used by the remote executor. */
  hooks?: string[];
};

/** Supported schema definition union. */
export type SchemaDef = LocalSchemaDef | RemoteSchemaDef;

/**
 * Resolve schema definition file paths and defaults.
 *
 * @param schemaDefs Raw schema definitions.
 * @param nuxt Nuxt instance.
 * @returns Resolved schema definitions.
 */
export async function resolveSchemaDefs(
  schemaDefs: SchemaDef[],
  nuxt: Nuxt,
): Promise<Required<SchemaDef>[]> {
  const { resolvePath } = createResolver(nuxt.options.rootDir);

  return Promise.all(
    schemaDefs.map(async (schemaDef) => {
      switch (schemaDef.type) {
        case "local": {
          const path = await resolvePath(schemaDef.path, { alias: nuxt.options.alias });
          return {
            type: "local",
            path: path.replaceAll("\\", "/"),
          };
        }

        case "remote": {
          const hooks = await Promise.all(
            (schemaDef.hooks ?? []).map(async (hookPath) => {
              const path = await resolvePath(hookPath, { alias: nuxt.options.alias });
              return path.replaceAll("\\", "/");
            }),
          );
          return {
            type: "remote",
            endpoint: schemaDef.endpoint,
            headers: schemaDef.headers ?? {},
            hooks,
          };
        }
      }
    }),
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Remote schema server template
// ────────────────────────────────────────────────────────────────────────────────

/** Remote schema template input. */
export type RemoteSchemaInput = {
  /** Remote GraphQL endpoint URL. */
  endpoint: string;
  /** Static request headers. */
  headers: Record<string, string>;
  /** Hook module paths. */
  hooks: string[];
  /** Introspected schema SDL. */
  sdl: string;
};

/**
 * Build a virtual module template for a remote schema.
 *
 * @param input Remote schema template input.
 * @returns Template source code.
 */
export function getRemoteSchemaTemplate({
  endpoint,
  headers,
  hooks,
  sdl,
}: RemoteSchemaInput): string {
  const hookImports = hooks.map(
    (hookPath, index) => `import hook${index} from ${JSON.stringify(hookPath)};`,
  );
  const hookRefs = hooks.map((_, index) => `hook${index}`);

  return `
import { getRemoteExecutor } from "#graphql/runtime/remote-executor";
import { buildSchema } from "graphql";
${hookImports.join("\n")}

const executor = getRemoteExecutor({
  endpoint: ${JSON.stringify(endpoint)},
  headers: ${JSON.stringify(headers)},
  hooks: [${hookRefs.join(", ")}],
});

export const schema = {
  schema: buildSchema(${JSON.stringify(sdl)}),
  executor,
};
`.trim();
}

// ────────────────────────────────────────────────────────────────────────────────
// GraphQL schema server / type template
// ────────────────────────────────────────────────────────────────────────────────

/** GraphQL schema server template input. */
export type SchemaInput = {
  /** Local schema module paths. */
  localPaths: string[];
  /** Remote schema virtual module paths. */
  remotePaths: string[];
};

/**
 * Build the GraphQL schema virtual server template.
 *
 * @param input Local and remote schema module paths.
 * @returns Template source code.
 */
export function getSchemaTemplate({ localPaths, remotePaths }: SchemaInput): string {
  // Local / remote schema imports
  const imports = [
    ...localPaths.map(
      (schemaPath, index) =>
        `import { schema as localSchema${index} } from ${JSON.stringify(schemaPath)};`,
    ),
    ...remotePaths.map(
      (schemaPath, index) =>
        `import { schema as remoteSchema${index} } from ${JSON.stringify(schemaPath)};`,
    ),
  ];

  // Local / remote / final schema references
  const localSchemaRefs = localPaths.map((_, index) => `localSchema${index}`);
  const remoteSchemaRefs = remotePaths.map((_, index) => `remoteSchema${index}`);
  const schemaRefs: string[] = [];

  // Merge local schemas if necessary
  if (localSchemaRefs.length === 1) {
    schemaRefs.push(localSchemaRefs[0]!);
  } else if (localSchemaRefs.length > 1) {
    imports.unshift(`import { mergeSchemas } from "@graphql-tools/schema";`);
    schemaRefs.push(`mergeSchemas({ schemas: [${localSchemaRefs.join(", ")}] })`);
  }

  // Add remote schema references
  schemaRefs.push(...remoteSchemaRefs);

  // Passthrough mode: a single remote subschema with no local schema. The
  // generated module re-exports the remote subschema's `GraphQLSchema` (so
  // yoga can validate operations) and its `executor` (so yoga and
  // `executeSchemaOperation` can forward execution to the remote endpoint
  // directly, without going through `graphql.execute` against a wrapped
  // schema). This avoids stitch/wrap's `mapSchema → rewireTypes` pass —
  // which throws `Unexpected schema type` at Cloudflare Workers deploy
  // validation on some schemas (e.g. wpgraphql-acf / ACFE interfaces) —
  // and cuts a meaningful chunk of cold-start work and bundle size.
  if (localPaths.length === 0 && remotePaths.length === 1) {
    return [
      ...imports,
      "",
      `export const schema = remoteSchema0.schema;`,
      `export const executor = remoteSchema0.executor;`,
    ].join("\n");
  }

  // Determine final schema reference for non-passthrough modes
  let schemaRef: string;
  if (schemaRefs.length === 0) {
    // No schemas defined: use default empty schema
    imports.unshift(`import {  buildSchema } from "graphql";`);
    schemaRef = `buildSchema("type Query { _empty: String }")`;
  } else if (remoteSchemaRefs.length === 0) {
    // Local-only (single local, or pre-merged via mergeSchemas above): use as-is
    schemaRef = schemaRefs[0]!;
  } else {
    // Multiple subschemas (or one remote alongside local resolvers): stitch.
    // `mergeTypes: false` keeps stitch from going through the more aggressive
    // merge path; subschemas from independent endpoints have no overlapping
    // types to merge anyway.
    imports.unshift(`import { stitchSchemas } from "@graphql-tools/stitch";`);
    schemaRef = `stitchSchemas({ subschemas: [${schemaRefs.join(", ")}], mergeTypes: false })`;
  }

  // `executor` is always exported so the runtime can destructure it
  // unconditionally; it's only populated in passthrough mode.
  return [
    ...imports,
    "",
    `export const schema = ${schemaRef};`,
    `export const executor = undefined;`,
  ].join("\n");
}

// ────────────────────────────────────────────────────────────────────────────────
// Schema utilities
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Load a local GraphQL schema module.
 *
 * @param path Module path.
 * @param nuxt Nuxt instance.
 * @returns Loaded GraphQL schema.
 */
export async function loadLocalSchema(path: string, nuxt: Nuxt): Promise<GraphQLSchema> {
  const { createJiti } = await import("jiti");
  const jiti = createJiti(import.meta.url, { interopDefault: true, alias: nuxt.options.alias });
  const module = (await jiti.import(path)) as { schema?: GraphQLSchema };
  if (
    !module.schema ||
    !(module.schema instanceof Object) ||
    typeof module.schema.getQueryType !== "function"
  ) {
    throw new Error(`${path} must export a valid 'schema' of type GraphQLSchema.`);
  }
  return module.schema;
}

/**
 * Introspect and build a remote GraphQL schema.
 *
 * @param endpoint Remote endpoint URL.
 * @param headers Request headers.
 * @returns Built GraphQL schema.
 */
export async function loadRemoteSchema(
  endpoint: string,
  headers: Record<string, string>,
): Promise<GraphQLSchema> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ query: getIntrospectionQuery() }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to introspect remote GraphQL schema at "${endpoint}" (HTTP ${response.status}).`,
    );
  }

  const json = (await response.json()) as { data?: IntrospectionQuery; errors?: unknown };
  if (json.errors) {
    throw new Error(
      `Failed to introspect remote GraphQL schema at "${endpoint}": ${JSON.stringify(json.errors)}`,
    );
  }

  if (!json.data || typeof json.data !== "object") {
    throw new Error(`Remote GraphQL introspection at "${endpoint}" returned no data.`);
  }

  const schema = buildClientSchema(json.data);
  return stripSubscriptions(schema);
}

/**
 * Strip subscription type from a GraphQL schema.
 * @param {GraphQLSchema} schema Input schema.
 * @returns {GraphQLSchema} Schema without subscription type.
 */
function stripSubscriptions(schema: GraphQLSchema): GraphQLSchema {
  if (!schema.getSubscriptionType()) {
    return schema;
  }
  return new GraphQLSchema({
    query: schema.getQueryType() ?? undefined,
    mutation: schema.getMutationType() ?? undefined,
    subscription: undefined,
    types: Object.values(schema.getTypeMap()),
    directives: schema.getDirectives(),
  });
}

/**
 * Print the SDL of a GraphQL schema.
 * @param schema GraphQLSchema instance.
 * @returns SDL string.
 */
export function getSchemaSDL(schema: GraphQLSchema): string {
  return printSchema(lexicographicSortSchema(schema));
}
