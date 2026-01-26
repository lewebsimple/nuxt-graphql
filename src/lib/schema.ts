import type { GraphQLSchema } from "graphql";
import { buildSchema, lexicographicSortSchema, printSchema } from "graphql";
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

/**
 * Render GraphQL schema template.
 * @param {SchemaInput} input Schema template input.
 * @returns TypeScript source code.
 */
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
  subschemas: [
    ${[mergedSchema, ...remoteSchemas].join(",\n    ")}
  ],
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
