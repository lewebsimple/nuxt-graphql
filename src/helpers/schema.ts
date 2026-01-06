import { dirname, join, relative } from "node:path";
import { print, printSchema, parse, buildClientSchema, getIntrospectionQuery, type GraphQLSchema, type IntrospectionQuery, lexicographicSortSchema } from "graphql";
import { createJiti } from "jiti";
import { stitchSchemas } from "@graphql-tools/stitch";
import type { Executor } from "@graphql-tools/utils";
import type { SubschemaConfig } from "@graphql-tools/delegate";
import { writeFileIfChanged } from "./file-operations";
import { cyan, logger, reset } from "./logger";

export interface RemoteSchemaOption {
  name: string;
  endpoint: string;
  headers?: Record<string, string>;
}

interface LoadedLocalSchema {
  name: string;
  schema: GraphQLSchema;
  sdl: string;
  modulePath: string;
  sourcePath: string;
  sdlPath: string;
}

interface LoadedRemoteSchema {
  name: string;
  subschema: SubschemaConfig;
  sdl: string;
  modulePath: string;
  sdlPath: string;
}

export interface SchemaArtifacts {
  stitchedSDL: string;
  stitchedSDLPath: string;
  stitchedModulePath: string;
  schemaPointers: string[];
}

export interface ResolveSchemasOptions {
  localSchema?: GraphQLSchema;
  localSchemaPath?: string;
  rootDir: string;
  buildDir: string;
  schemaOutputPath: string;
  remoteSchemas?: RemoteSchemaOption[];
}

const schemaHeader = "/* GraphQL */";
const escapeSDL = (sdl: string) => sdl.replace(/`/g, "\\`");
const serializeSDL = (sdl: string) => `${schemaHeader} \`${escapeSDL(sdl)}\``;

export async function loadLocalSchema(schemaPath: string): Promise<GraphQLSchema> {
  const jiti = createJiti(import.meta.url, { interopDefault: true });
  const module = (await jiti.import(schemaPath)) as { schema?: GraphQLSchema };

  if (!module.schema) {
    throw new Error(`${schemaPath} must export a 'schema' variable`);
  }

  return module.schema;
}

const sanitizeName = (name: string) => name.toLowerCase().replace(/[^a-z0-9_-]/g, "-");

const introspectRemoteSchema = async (executor: Executor): Promise<GraphQLSchema> => {
  const document = parse(getIntrospectionQuery());
  const result = await executor({ document });
  const data = (result as { data?: unknown }).data as IntrospectionQuery | undefined;

  if (!data) {
    throw new Error("Remote schema introspection failed: no data returned");
  }

  return buildClientSchema(data);
};

const createExecutor = (endpoint: string, headers: Record<string, string> = {}): Executor => async ({ document, variables }) => {
  const query = typeof document === "string" ? document : print(document);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify({ query, variables }),
  });

  return response.json();
};

const writeLocalSchemaModule = (sdl: string, modulePath: string, sourcePath: string): void => {
  const content = [
    `export { schema } from ${JSON.stringify(sourcePath)};`,
  ].join("\n");
  writeFileIfChanged(modulePath, content);
};

const writeRemoteSchemaModule = (sdl: string, modulePath: string, endpoint: string, headers?: Record<string, string>): void => {
  const headerSource = headers && Object.keys(headers).length > 0 ? JSON.stringify(headers, null, 2) : "{}";

  const content = [
    "import { buildSchema, print } from \"graphql\";",
    "import type { Executor, SubschemaConfig } from \"@graphql-tools/utils\";",
    "",
    `const endpoint = ${JSON.stringify(endpoint)};`,
    `const headers = ${headerSource} as Record<string, string>;`,
    "",
    "const executor: Executor = async ({ document, variables }) => {",
    "  const query = typeof document === \"string\" ? document : print(document);",
    "  const response = await fetch(endpoint, {",
    "    method: \"POST\",",
    "    headers: { \"content-type\": \"application/json\", ...headers },",
    "    body: JSON.stringify({ query, variables }),",
    "  });",
    "",
    "  return response.json();",
    "};",
    "",
    `const schemaSDL = ${serializeSDL(sdl)};`,
    "",
    "export const schema: SubschemaConfig = {",
    "  schema: buildSchema(schemaSDL),",
    "  executor,",
    "};",
    "",
    "export default schema;",
    "",
  ].join("\n");

  writeFileIfChanged(modulePath, content);
};

const writeStitchedSchemaModule = (modulePath: string, localSchemas: LoadedLocalSchema[], remoteSchemas: LoadedRemoteSchema[]): void => {
  const stitchedDir = dirname(modulePath);
  const imports: string[] = [];
  const schemaRefs: string[] = [];

  localSchemas.forEach((schema) => {
    const importName = `${schema.name}Schema`;
    const rawImport = relative(stitchedDir, schema.modulePath);
    const importPath = rawImport.startsWith(".") ? rawImport : `./${rawImport}`;
    const normalizedImport = importPath.replace(/\\/g, "/");
    imports.push(`import { schema as ${importName} } from ${JSON.stringify(normalizedImport)};`);
    schemaRefs.push(importName);
  });

  remoteSchemas.forEach((schema) => {
    const importName = `${schema.name}Subschema`;
    const rawImport = relative(stitchedDir, schema.modulePath);
    const importPath = rawImport.startsWith(".") ? rawImport : `./${rawImport}`;
    const normalizedImport = importPath.replace(/\\/g, "/");
    imports.push(`import { schema as ${importName} } from ${JSON.stringify(normalizedImport)};`);
    schemaRefs.push(importName);
  });

  const content = [
    "import { stitchSchemas } from \"@graphql-tools/stitch\";",
    "import type { GraphQLSchema } from \"graphql\";",
    "import type { SubschemaConfig } from \"@graphql-tools/utils\";",
    ...imports,
    "",
    "const subschemas: Array<GraphQLSchema | SubschemaConfig> = [",
    ...schemaRefs.map((ref) => `  ${ref},`),
    "];",
    "",
    "export const schema = stitchSchemas({ subschemas });",
    "",
    "export default schema;",
    "",
  ].join("\n");

  writeFileIfChanged(modulePath, content);
};

export async function resolveSchemas(options: ResolveSchemasOptions): Promise<SchemaArtifacts> {
  const { localSchema, localSchemaPath, remoteSchemas = [], rootDir, buildDir, schemaOutputPath } = options;

  const sanitizedRemotes = remoteSchemas.map((remote) => ({
    ...remote,
    name: sanitizeName(remote.name),
  }));

  const duplicate = sanitizedRemotes.find((remote, index) => sanitizedRemotes.findIndex((r) => r.name === remote.name) !== index);
  if (duplicate) {
    throw new Error(`Duplicate remote schema name detected: '${duplicate.name}'. Please use unique names.`);
  }

  const localSchemas: LoadedLocalSchema[] = [];
  const remoteResults: LoadedRemoteSchema[] = [];

  if (localSchema) {
    if (!localSchemaPath) {
      throw new Error("Local schema provided without a source path");
    }

    const sorted = lexicographicSortSchema(localSchema);
    const sdl = printSchema(sorted);
    const name = "local";
    const modulePath = join(buildDir, "graphql/schemas", `${name}-schema.ts`);
    const sdlPath = join(buildDir, "graphql/schemas", `${name}.graphql`);

    writeLocalSchemaModule(sdl, modulePath, localSchemaPath);
    writeFileIfChanged(sdlPath, `${sdl}\n`);

    localSchemas.push({ name, schema: localSchema, sdl, modulePath, sourcePath: localSchemaPath, sdlPath });
  }

  for (const remote of sanitizedRemotes) {
    const executor = createExecutor(remote.endpoint, remote.headers);
    const introspectedSchema = await introspectRemoteSchema(executor);
    const sorted = lexicographicSortSchema(introspectedSchema);
    const sdl = printSchema(sorted);
    const modulePath = join(buildDir, "graphql/schemas", `${remote.name}-schema.ts`);
    const sdlPath = join(buildDir, "graphql/schemas", `${remote.name}.graphql`);

    writeRemoteSchemaModule(sdl, modulePath, remote.endpoint, remote.headers);
    writeFileIfChanged(sdlPath, `${sdl}\n`);

    remoteResults.push({ name: remote.name, subschema: { schema: sorted, executor }, sdl, modulePath, sdlPath });
  }

  const subschemas = [...localSchemas.map((s) => s.schema), ...remoteResults.map((s) => s.subschema)];

  if (subschemas.length === 0) {
    throw new Error("No GraphQL schema found. Provide a local schema or at least one remote schema.");
  }

  const stitched = stitchSchemas({ subschemas });
  const stitchedSorted = lexicographicSortSchema(stitched);
  const stitchedSDL = printSchema(stitchedSorted);

  writeStitchedSchemaModule(join(buildDir, "graphql", "stitched-schema.ts"), localSchemas, remoteResults);

  writeFileIfChanged(schemaOutputPath, `${stitchedSDL}\n`);
  logger.info(`GraphQL schema saved to ${cyan}${relative(rootDir, schemaOutputPath)}${reset}`);

  return {
    stitchedSDL,
    stitchedSDLPath: schemaOutputPath,
    stitchedModulePath: join(buildDir, "graphql", "stitched-schema.ts"),
    schemaPointers: [
      schemaOutputPath,
      ...localSchemas.map((s) => s.sdlPath),
      ...remoteResults.map((s) => s.sdlPath),
    ],
  };
}
