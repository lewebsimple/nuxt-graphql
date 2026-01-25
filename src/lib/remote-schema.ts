import { GraphQLSchema, buildClientSchema, getIntrospectionQuery } from "graphql";
import { getSchemaSDL } from "./schema";

// ────────────────────────────────────────────────────────────────────────────────
// Remote schema template
// ────────────────────────────────────────────────────────────────────────────────

export type RemoteSchemaInput = {
  endpoint: string;
  loadSchema: () => Promise<GraphQLSchema>;
};

/**
 * Render remote GraphQL schema template.
 * @param {RemoteSchemaInput} input Remote schema template input.
 * @returns TypeScript source code.
 */
export async function getRemoteSchemaTemplate({ endpoint, loadSchema }: RemoteSchemaInput): Promise<string> {
  const schema = await loadSchema();
  const sdl = getSchemaSDL(schema);
  return `
import { buildSchema } from "graphql";
import { buildHTTPExecutor } from "@graphql-tools/executor-http";

const executor = buildHTTPExecutor({
  endpoint: "${endpoint}",
  fetch: globalThis.fetch,
});

const sdl = \`${sdl.replace(/`/g, "\\`")}\`;

// SubschemaConfig exported for stitching
export const schema = {
  schema: buildSchema(sdl),
  executor,
}
  `.trim();
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
