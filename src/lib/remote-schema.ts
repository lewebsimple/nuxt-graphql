import { GraphQLSchema, buildClientSchema, getIntrospectionQuery } from "graphql";
import { getSchemaSDL } from "./schema";
import { splitModule } from "./split-module";

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
import { buildSchema } from "graphql";
import { createRemoteExecutor } from "#graphql/runtime/remote-executor";
${hooksImports.join("\n")}

const executor = createRemoteExecutor({
  endpoint: "${endpoint}",
  headers: ${JSON.stringify(headers)},
  hooks: [${hooksArray.join(", ")}],
});

const sdl = \`${sdl.replace(/`/g, "\\`")}\`;

// SubschemaConfig exported for stitching
export const schema = {
  schema: buildSchema(sdl),
  executor,
}
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
