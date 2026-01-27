import { buildClientSchema, buildSchema, getIntrospectionQuery, lexicographicSortSchema, printSchema, GraphQLSchema } from "graphql";
import type { HeadersInput } from "../runtime/shared/lib/headers";
import { splitModule } from "./split-module";

// ────────────────────────────────────────────────────────────────────────────────
// Schema definitions (local / remote)
// ────────────────────────────────────────────────────────────────────────────────

export type LocalSchemaDef = { type: "local"; path: string };
export type RemoteSchemaDef = { type: "remote"; endpoint: string; headers?: HeadersInput; hooks?: string[] };
export type SchemaDef = LocalSchemaDef | RemoteSchemaDef;

// ────────────────────────────────────────────────────────────────────────────────
// Schema template
// ────────────────────────────────────────────────────────────────────────────────

export type SchemaInput = {
  local: Record<string, { importPath: string }>;
  remote: Record<string, { importPath: string }>;
};

export function getSchemaTemplate({ local, remote }: SchemaInput): { ts: string; mjs: string; dts: string } {
  const localImports = Object.entries(local).map(([name, { importPath }]) => `import { schema as ${name}LocalSchema } from ${JSON.stringify(importPath)};`);
  const localSchemas = Object.keys(local).map((name) => `${name}LocalSchema`);
  const mergedSchema = `mergeSchemas({ schemas: [${localSchemas.join(", ")}] })`;

  const remoteImports = Object.entries(remote).map(([name, { importPath }]) => `import { schema as ${name}RemoteSchema } from ${JSON.stringify(importPath)};`);
  const remoteSchemas = Object.keys(remote).map((name) => `${name}RemoteSchema`);

  const ts = `
import { mergeSchemas } from "@graphql-tools/schema";
import { stitchSchemas } from "@graphql-tools/stitch";
${localImports.join("\n")}
${remoteImports.join("\n")}

export const schema = stitchSchemas({
  subschemas: [${[mergedSchema, ...remoteSchemas].join(", ")}],
});
  `.trim();

  return { ts, ...splitModule(ts) };
}

// ────────────────────────────────────────────────────────────────────────────────
// Load local schema via Jiti
// ────────────────────────────────────────────────────────────────────────────────

type LoadLocalSchemaInput = {
  importPath: string;
};

/**
 * Load a local GraphQL schema module via Jiti.
 *
 * @param {LoadLocalSchemaInput} input Local schema loader input.
 * @returns GraphQLSchema instance.
 */
export async function loadLocalSchema({ importPath }: LoadLocalSchemaInput): Promise<GraphQLSchema> {
  const { createJiti } = await import("jiti");
  const jiti = createJiti(import.meta.url, { interopDefault: true });
  const module = (await jiti.import(importPath)) as { schema?: GraphQLSchema };
  if (!module.schema || !(module.schema instanceof Object) || typeof module.schema.getQueryType !== "function") {
    throw new Error(`${importPath} must export a valid 'schema' of type GraphQLSchema.`);
  }
  return module.schema;
}

// ────────────────────────────────────────────────────────────────────────────────
// Remote schema template
// ────────────────────────────────────────────────────────────────────────────────

export type RemoteSchemaInput = {
  endpoint: string;
  headers: HeadersInput;
  hooks: { importPath: string }[];
  loadSchema: () => Promise<GraphQLSchema>;
};

/**
 * Render remote GraphQL schema template.
 * @param {RemoteSchemaInput} input Remote schema template input.
 * @returns .ts / .mjs source code.
 */
export async function getRemoteSchemaTemplate({ endpoint, headers, hooks, loadSchema }: RemoteSchemaInput): Promise<{ ts: string; mjs: string; dts: string }> {
  const hooksImports = hooks.map((hook, index) => `import hook${index} from ${JSON.stringify(hook.importPath)};`);
  const hooksArray = hooks.map((_, index) => `hook${index}`);
  const schema = await loadSchema();
  const sdl = getSchemaSDL(schema);

  const ts = `
import type { GraphQLSchema } from "graphql";
import { buildSchema } from "graphql";
import { getRemoteExecutor } from "#graphql/runtime/remote-executor";
${hooksImports.join("\n")}

const executor = getRemoteExecutor({
  endpoint: "${endpoint}",
  headers: ${JSON.stringify(headers)},
  hooks: [${hooksArray.join(", ")}],
});

const sdl = \`${sdl.replace(/`/g, "\\`")}\`;

// SubschemaConfig exported for stitching
export const schema = {
  schema: buildSchema(sdl),
  executor,
} as unknown as GraphQLSchema;
  `.trim();

  return { ts, ...splitModule(ts) };
}

// ────────────────────────────────────────────────────────────────────────────────
// Remote schema introspection
// ────────────────────────────────────────────────────────────────────────────────

export type IntrospectRemoteSchemaInput = {
  endpoint: string;
};

/**
 * Introspect a remote GraphQL schema via introspection query.
 * @param {IntrospectRemoteSchemaInput} input Introspection input.
 * @returns GraphQLSchema instance.
 */
export async function introspectRemoteSchema({ endpoint }: IntrospectRemoteSchemaInput): Promise<GraphQLSchema> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: getIntrospectionQuery() }),
  });
  const json = await response.json();
  if (json.errors) {
    throw new Error(`Failed to fetch GraphQL schema from ${endpoint}: ${JSON.stringify(json.errors)} `);
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

// ────────────────────────────────────────────────────────────────────────────────
// Get schema SDL from GraphQLSchema
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Print the SDL of a GraphQL schema.
 * @param schema GraphQLSchema instance.
 * @returns SDL string.
 */
export function getSchemaSDL(schema: GraphQLSchema): string {
  return printSchema(lexicographicSortSchema(schema));
}

/**
 * Get a default empty GraphQL schema.
 * @returns GraphQLSchema instance.
 */
export function getDefaultSchema(): GraphQLSchema {
  return buildSchema(`type Query { _empty: String }`);
}
