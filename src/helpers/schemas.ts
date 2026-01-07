import { existsSync } from "node:fs";
import { buildClientSchema, getIntrospectionQuery, printSchema } from "graphql";
import { toImportPath, writeFileIfChanged } from "./file-operations";

export type LocalSchema = {
  type: "local";
  path: string;
};

export type RemoteSchema = {
  type: "remote";
  url: string;
  headers?: Record<string, string>;
  middleware?: string;
};

export type SchemaDefinition = LocalSchema | RemoteSchema;

// Write a proxy module that re-exports the user's local schema
export function writeLocalSchemaModule({ localPath, modulePath }: {
  localPath: string;
  modulePath: string;
}) {
  if (!existsSync(localPath)) {
    throw new Error(`Local schema file not found at path: ${localPath}`);
  }
  const content = [
    `export { schema } from ${JSON.stringify(toImportPath(modulePath, localPath))};`,
  ].join("\n");
  return writeFileIfChanged(modulePath, content);
}

// Fetch and cache a remote schema SDL into a TypeScript module with a named export
export async function writeRemoteSchemaSdl({ schemaDef: { url, headers }, sdlPath }: {
  schemaDef: RemoteSchema;
  sdlPath: string;
}) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ query: getIntrospectionQuery() }),
  });

  const json = await response.json();
  if (json.errors) {
    throw new Error(`Failed to fetch remote schema from ${url}: ${JSON.stringify(json.errors)}`);
  }

  const schema = buildClientSchema(json.data);
  const sdl = printSchema(schema);
  const content = `export const sdl = \`${sdl.replace(/`/g, "\\`")}\`;`;
  return writeFileIfChanged(sdlPath, content);
}

// Build a remote schema proxy that constructs a GraphQL schema and executor from the cached SDL
export function writeRemoteSchemaModule({ schemaDef: { url, headers }, sdlPath, modulePath }: {
  schemaDef: RemoteSchema;
  sdlPath: string;
  modulePath: string;
}) {
  const headerSource = headers && Object.keys(headers).length > 0 ? JSON.stringify(headers, null, 2) : "{}";
  const content = [
    `import { buildSchema, print } from "graphql";`,
    `import type { Executor } from "@graphql-tools/utils";`,
    `import type { SubschemaConfig } from "@graphql-tools/delegate";`,
    `import { sdl } from ${JSON.stringify(toImportPath(modulePath, sdlPath))};`,
    ``,
    `const endpoint = ${JSON.stringify(url)};`,
    `const headers = ${headerSource} as Record<string, string>;`,
    ``,
    `const executor: Executor = async ({ document, variables }) => {`,
    `  const query = typeof document === "string" ? document : print(document);`,
    `  const response = await fetch(endpoint, {`,
    `    method: "POST",`,
    `    headers: { "Content-Type": "application/json", ...headers },`,
    `    body: JSON.stringify({ query, variables }),`,
    `  });`,
    ``,
    `  return response.json();`,
    `};`,
    ``,
    `export const schema: SubschemaConfig = {`,
    `  schema: buildSchema(sdl),`,
    `  executor,`,
    `};`,
    ``,
  ].join("\n");
  return writeFileIfChanged(modulePath, content);
}

// Stitch together the per-source schemas into a single exported schema
export function writeStitchedSchemaModule({ schemaNames, modulePath }: {
  schemaNames: string[];
  modulePath: string;
}) {
  const schemas = schemaNames.map((name) => ({
    path: `./schemas/${name}`,
    ref: `${name}Schema`,
  }));

  const content = [
    `import { stitchSchemas } from "@graphql-tools/stitch";`,
    `import type { GraphQLSchema } from "graphql";`,
    `import type { SubschemaConfig } from "@graphql-tools/delegate";`,
    ...schemas.map(({ path, ref }) => `import { schema as ${ref} } from ${JSON.stringify(path)};`),
    ``,
    `const subschemas: Array<GraphQLSchema | SubschemaConfig> = [`,
    ...schemas.map(({ ref }) => `  ${ref},`),
    `];`,
    ``,
    `export const schema = stitchSchemas({ subschemas });`,
    ``,
  ].join("\n");

  return writeFileIfChanged(modulePath, content);
}
