import { buildClientSchema, getIntrospectionQuery, GraphQLSchema } from "graphql";
import { mergeHeaders, type HeadersInput } from "../runtime/shared/lib/headers";

// ────────────────────────────────────────────────────────────────────────────────
// GraphQL schema definitions
// ────────────────────────────────────────────────────────────────────────────────

export interface LocalSchemaDef {
  type: "local";

  /**
   * Path to a server-side module exporting
   * `export default defineLocalGraphQLSchema({ schema })`
   * Resolved from rootDir.
   */
  path: string;
}

export interface RemoteSchemaDef {
  type: "remote";

  /**
   * Remote GraphQL endpoint.
   * Used for build-time introspection and runtime delegation.
   */
  url: string;

  /**
   * Static headers applied to all delegated requests.
   * `null` unsets a header.
   */
  headers?: HeadersInput;

  /**
   * Paths to remote execution hook modules.
   * Resolved from rootDir.
   */
  hooks?: string[];
}

export type SchemaDef = LocalSchemaDef | RemoteSchemaDef;

// ────────────────────────────────────────────────────────────────────────────────
// Local schema template
// ────────────────────────────────────────────────────────────────────────────────

type LocalTemplateInput = {
  schemaModule: string;
};

/**
 * Render a virtual module that re-exports a local GraphQL schema.
 *
 * @param {LocalTemplateInput} options Local schema template input.
 * @param options.schemaModule Absolute module path to the local schema.
 * @returns TypeScript source for the schema module.
 */
export function renderLocalSchemaTemplate({ schemaModule }: LocalTemplateInput): string {
  return `export { schema } from ${JSON.stringify(schemaModule)};`;
}

// ────────────────────────────────────────────────────────────────────────────────
// Remote schema template
// ────────────────────────────────────────────────────────────────────────────────

type RemoteTemplateInput = {
  remoteExecutorModule: string;
  hooksModules: string[];
  schemaDef: RemoteSchemaDef;
  schemaLoader: () => Promise<GraphQLSchema>;
};

/**
 * Render a virtual module that wraps a remote schema with an HTTP executor.
 *
 * @param {RemoteTemplateInput} options Remote schema template input.
 * @param options.remoteExecutorModule Module path exporting createRemoteExecutor.
 * @param options.hooksModules Hook module paths to import.
 * @param options.schemaLoader Function to load the introspected GraphQL schema.
 * @param options.schemaDef Remote schema definition.
 * @returns TypeScript source for the remote schema module.
 */
export async function renderRemoteSchemaTemplate({ remoteExecutorModule, hooksModules, schemaDef, schemaLoader }: RemoteTemplateInput): Promise<string> {
  const importHooks = hooksModules.map((hookPath, index) => `import hooks${index} from ${JSON.stringify(hookPath)};`);
  const hooks = hooksModules.map((_, index) => `hooks${index}`);
  const { url, headers } = schemaDef;
  const schema = await schemaLoader();
  const sdl = await printSchemaSDL(schema);
  return `
import { buildSchema } from "graphql";
import { createRemoteExecutor } from ${JSON.stringify(remoteExecutorModule)};
${importHooks.join("\n")}

const sdl = /* GraphQL */ \`${sdl.replace(/`/g, "\\`")}\`;

export const schema = {
  schema: buildSchema(sdl),
  executor: createRemoteExecutor({
    url: ${JSON.stringify(url)},
    headers: ${JSON.stringify(headers || {})},
    hooks: [${hooks.join(", ")}]
  }),
};
`.trim();
}

// ────────────────────────────────────────────────────────────────────────────────
// Stitched schema template
// ────────────────────────────────────────────────────────────────────────────────

type StitchedSchemaTemplateInput = {
  schemaNames: string[];
};

/**
 * Render a virtual module that stitches the generated schemas.
 *
 * @returns TypeScript source for the stitched schema module.
 */
export function renderStitchedSchemaTemplate({ schemaNames }: StitchedSchemaTemplateInput): string {
  const importSchemas = schemaNames.map((name) => `import { schema as ${name}Schema } from ${JSON.stringify(`./schemas/${name}`)};`);
  const schemas = schemaNames.map((name) => `${name}Schema`);
  return `
import { stitchSchemas } from "@graphql-tools/stitch";
${importSchemas.join("\n")}

export const schema = stitchSchemas({
  subschemas: [${schemas.join(", ")}],
});`.trim();
}

// ────────────────────────────────────────────────────────────────────────────────
// Local schema loader
// ────────────────────────────────────────────────────────────────────────────────

type LoadLocalSchemaInput = {
  schemaModule: string;
};

/**
 * Load a local GraphQL schema module via Jiti.
 *
 * @param {LoadLocalSchemaInput} input Local schema loader input.
 * @param input.schemaModule Absolute path to the schema module.
 * @returns GraphQLSchema instance.
 */
export async function loadLocalSchema({ schemaModule }: LoadLocalSchemaInput): Promise<GraphQLSchema> {
  const { createJiti } = await import("jiti");
  const jiti = createJiti(import.meta.url, { interopDefault: true });
  const module = (await jiti.import(schemaModule)) as { schema?: GraphQLSchema };
  if (!module.schema || !(module.schema instanceof Object) || typeof module.schema.getQueryType !== "function") {
    throw new Error(`${schemaModule} must export a valid 'schema' of type GraphQLSchema.`);
  }
  return module.schema;
}

// ────────────────────────────────────────────────────────────────────────────────
// Remote schema introspection
// ────────────────────────────────────────────────────────────────────────────────

type IntrospectRemoteSchemaInput = Pick<RemoteSchemaDef, "url" | "headers">;

/**
 * Introspect a remote schema over HTTP and strip subscriptions.
 *
 * @param {IntrospectRemoteSchemaInput} input Remote schema definition.
 * @param input.url Remote GraphQL endpoint URL.
 * @param input.headers Optional HTTP headers.
 * @returns Introspected GraphQL schema.
 */
export async function introspectRemoteSchema({ url, headers }: IntrospectRemoteSchemaInput): Promise<GraphQLSchema> {
  const response = await fetch(url, {
    method: "POST",
    headers: mergeHeaders({ "Content-Type": "application/json" }, headers),
    body: JSON.stringify({ query: getIntrospectionQuery() }),
  });
  const json = await response.json();
  if (json.errors) {
    throw new Error(`Failed to fetch GraphQL schema from ${url}: ${JSON.stringify(json.errors)} `);
  }
  const schema = buildClientSchema(json.data);
  return stripSubscriptions(schema);
}

// ────────────────────────────────────────────────────────────────────────────────
// Schema helpers
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Remove subscription types from a schema.
 *
 * @param schema Input GraphQL schema.
 * @returns Schema without subscription support.
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
 * Print a lexicographically-sorted schema SDL.
 *
 * @param schema GraphQL schema.
 * @returns SDL string.
 */
export async function printSchemaSDL(schema: GraphQLSchema): Promise<string> {
  const { printSchema, lexicographicSortSchema } = await import("graphql");
  return printSchema(lexicographicSortSchema(schema));
}
