import { buildClientSchema, getIntrospectionQuery, GraphQLSchema } from "graphql";
import { mergeHeaders, type HeadersInput } from "../runtime/shared/lib/headers";
import { stitchSchemas } from "@graphql-tools/stitch";

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

type LocalTemplateInput = LocalSchemaDef;

/**
 * Render a virtual module that re-exports a local GraphQL schema.
 *
 * @param {LocalTemplateInput} options Local schema template input.
 * @param options.path Absolute module path to the local schema.
 * @returns TypeScript source for the schema module.
 */
export function renderLocalSchemaTemplate({ path }: LocalTemplateInput): string {
  return `export { schema } from ${JSON.stringify(path)};`;
}

/**
 * Load a local GraphQL schema module via Jiti.
 *
 * @param {LocalSchemaDef} options Local schema definition.
 * @param options.path Absolute path to the schema module.
 * @returns GraphQLSchema instance.
 */
export async function loadLocalSchema({ path }: LocalSchemaDef): Promise<GraphQLSchema> {
  const { createJiti } = await import("jiti");
  const jiti = createJiti(import.meta.url, { interopDefault: true });
  const module = (await jiti.import(path)) as { schema?: GraphQLSchema };
  if (!module.schema || !(module.schema instanceof Object) || typeof module.schema.getQueryType !== "function") {
    throw new Error(`${path} must export a valid 'schema' of type GraphQLSchema.`);
  }
  return module.schema;
}

type RemoteTemplateInput = RemoteSchemaDef & {
  remoteExecutorModule: string;
};

/**
 * Render a virtual module that wraps a remote schema with an HTTP executor.
 *
 * @param {RemoteTemplateInput} options Remote schema template input.
 * @param options.url Remote GraphQL endpoint.
 * @param options.headers Optional static headers.
 * @param options.remoteExecutorModule Module path exporting createRemoteExecutor.
 * @param options.type Schema type (remote).
 * @param options.hooks Hook module paths to import.
 * @returns TypeScript source for the remote schema module.
 */
export async function renderRemoteSchemaTemplate({ remoteExecutorModule, type, hooks, ...schemaDef }: RemoteTemplateInput): Promise<string> {
  const schema = await introspectRemoteSchema(schemaDef);
  const sdl = await printSchemaSDL(schema);
  const imports = (hooks || []).map((hookPath, index) => `import hooks${index} from ${JSON.stringify(hookPath)};`);
  return [
    `import { buildSchema } from "graphql";`,
    `import type { SubschemaConfig } from "@graphql-tools/delegate";`,
    `import { createRemoteExecutor } from ${JSON.stringify(remoteExecutorModule)};`,
    ...imports,
    ``,
    `const sdl = /* GraphQL */ \`${sdl.replace(/`/g, "\\`")}\`;`,
    ``,
    `export const schema: SubschemaConfig = {`,
    `  schema: buildSchema(sdl),`,
    `  executor: createRemoteExecutor({`,
    `    ...${JSON.stringify(schemaDef)},`,
    `    hooks: [`,
    ...(hooks || []).map((_, index) => `      hooks${index},`),
    `    ]`,
    `  }),`,
    `};`,
  ].join("\n");
}

/**
 * Introspect a remote schema over HTTP and strip subscriptions.
 *
 * @param {RemoteSchemaDef} options Remote schema definition.
 * @param options.url Remote GraphQL endpoint URL.
 * @param options.headers Optional HTTP headers.
 * @returns Introspected GraphQL schema.
 */
export async function introspectRemoteSchema({ url, headers }: Omit<RemoteSchemaDef, "type" | "hooks">): Promise<GraphQLSchema> {
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

type StitchedSchemaTemplateInput = {
  schemaNames: string[];
};

/**
 * Render a virtual module that stitches the generated schemas.
 *
 * @param {StitchedSchemaTemplateInput} options Stitched schema template input.
 * @param options.schemaNames Schema module names.
 * @returns TypeScript source for the stitched schema module.
 */
export function renderStitchedSchemaTemplate({ schemaNames }: StitchedSchemaTemplateInput): string {
  return [
    `import type { GraphQLSchema } from "graphql"; `,
    `import type { SubschemaConfig } from "@graphql-tools/delegate"; `,
    `import { stitchSchemas } from "@graphql-tools/stitch"; `,
    ...schemaNames.map((name) => `import { schema as ${name}Schema } from ${JSON.stringify(`./schemas/${name}`)}; `),
    ``,
    `const subschemas: Array<GraphQLSchema | SubschemaConfig> = [`,
    ...schemaNames.map((name) => `  ${name}Schema, `),
    `]; `,
    ``,
    `export const schema = stitchSchemas({ subschemas }); `,
  ].join("\n");
}

/**
 * Load and stitch all configured schemas.
 *
 * @param schemaDefs Schema definitions to load.
 * @returns Stitched GraphQL schema.
 */
export async function loadStitchedSchema(schemaDefs: Record<string, SchemaDef>): Promise<GraphQLSchema> {
  const subschemas: GraphQLSchema[] = [];
  for (const schemaDef of Object.values(schemaDefs)) {
    if (schemaDef.type === "local") {
      subschemas.push(await loadLocalSchema(schemaDef));
    }
    else if (schemaDef.type === "remote") {
      subschemas.push(await introspectRemoteSchema(schemaDef));
    }
  }
  return stitchSchemas({ subschemas });
}
