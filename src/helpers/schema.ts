import { join } from "node:path";
import type { GraphQLSchema } from "graphql";
import { findSingleFile } from "./file-operations";
import { getRemoteExecMiddlewareProxy } from "./remote-exec-middleware";
import { removeFileExtension } from "./server-proxy";

export type LocalSchemaDef = {
  type: "local";
  path: string;
};

export type RemoteSchemaDef = {
  type: "remote";
  url: string;
  headers?: HeadersInit;
  middleware?: string;
};

export type SchemaDef = LocalSchemaDef | RemoteSchemaDef;

// Generate server proxy for local GraphQL schema
export async function getLocalSchemaProxy({ layerRootDirs, schemaDef }: {
  layerRootDirs: string[];
  schemaDef: LocalSchemaDef;
}): Promise<string> {
  const schemaPath = await findSingleFile(layerRootDirs, schemaDef.path, true);
  const content = [
    `export { schema } from ${JSON.stringify(removeFileExtension(schemaPath))};`,
  ].join("\n");
  return content;
}

// Generate server proxy for remote GraphQL schema
export async function getRemoteSchemaProxy({ rootDir, schemaName, schemaDef }: {
  rootDir: string;
  schemaName: string;
  schemaDef: RemoteSchemaDef;
}): Promise<{ sdlContent: string; schemaContent: string; middlewareContent: string }> {
  // Generate remote exec middleware proxy
  const middlewareContent = getRemoteExecMiddlewareProxy(schemaDef.middleware ? join(rootDir, schemaDef.middleware) : undefined);

  // Fetch remote schema and generate SDL proxy
  const schema = await fetchGraphQLSchema(schemaDef.url, schemaDef.headers);
  const sdl = await getSDLFromGraphQLSchema(schema);
  const sdlContent = `export const sdl = /* GraphQL */ \`${sdl.replace(/`/g, "\\`")}\`;`;

  // Generate schema proxy using shared remote executor helper
  const schemaContent = [
    `import { buildSchema } from "graphql";`,
    `import type { SubschemaConfig } from "@graphql-tools/delegate";`,
    `import { remoteExecMiddlewareHandler } from "./${schemaName}-middleware";`,
    `import { sdl } from "./${schemaName}-sdl";`,
    `import { createRemoteExecutor } from "../remote-executor";`,
    ``,
    `const headers = ${JSON.stringify(schemaDef.headers ?? {}, null, 2)} as HeadersInit;`,
    ``,
    `const executor = createRemoteExecutor({`,
    `  url: ${JSON.stringify(schemaDef.url)},`,
    `  remoteName: ${JSON.stringify(schemaName)},`,
    `  headers,`,
    `  middleware: remoteExecMiddlewareHandler,`,
    `});`,
    ``,
    `export const schema: SubschemaConfig = {`,
    `  schema: buildSchema(sdl),`,
    `  executor,`,
    `};`,
  ].join("\n");

  return { middlewareContent, sdlContent, schemaContent };
}

// Generate server proxy for a stitched GraphQL schema
export async function getStitchedSchemaProxy({ schemaNames }: {
  schemaNames: string[];
}): Promise<string> {
  const content = [
    `import { stitchSchemas } from "@graphql-tools/stitch"; `,
    `import type { GraphQLSchema } from "graphql"; `,
    `import type { SubschemaConfig } from "@graphql-tools/delegate"; `,
    ...schemaNames.map((name) => `import { schema as ${name}Schema } from ${JSON.stringify(`./schemas/${name}`)}; `),
    ``,
    `const subschemas: Array<GraphQLSchema | SubschemaConfig> = [`,
    ...schemaNames.map((name) => `  ${name}Schema, `),
    `]; `,
    ``,
    `export const schema = stitchSchemas({ subschemas }); `,
  ].join("\n");
  return content;
}

// Load a local GraphQL schema from a given path
export async function loadGraphQLSchema(schemaPath: string): Promise<GraphQLSchema> {
  const { createJiti } = await import("jiti");
  const jiti = createJiti(import.meta.url, { interopDefault: true });
  const module = (await jiti.import(schemaPath)) as { schema?: GraphQLSchema };
  if (!module.schema || !(module.schema instanceof Object) || typeof module.schema.getQueryType !== "function") {
    throw new Error(`${schemaPath} must export a valid 'schema' of type GraphQLSchema.`);
  }
  return module.schema;
}

// Fetch a remote GraphQL schema via introspection
export async function fetchGraphQLSchema(schemaUrl: string, headers?: HeadersInit): Promise<GraphQLSchema> {
  const { getIntrospectionQuery, buildClientSchema } = await import("graphql");
  const response = await fetch(schemaUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ query: getIntrospectionQuery() }),
  });
  const json = await response.json();
  if (json.errors) {
    throw new Error(`Failed to fetch GraphQL schema from ${schemaUrl}: ${JSON.stringify(json.errors)} `);
  }
  return buildClientSchema(json.data);
}

// Convert a GraphQLSchema object to SDL string
export async function getSDLFromGraphQLSchema(schema: GraphQLSchema): Promise<string> {
  const { printSchema, lexicographicSortSchema } = await import("graphql");
  return printSchema(lexicographicSortSchema(schema));
}
