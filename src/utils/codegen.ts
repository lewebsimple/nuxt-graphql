import { generate } from "@graphql-codegen/cli";
import type { GraphQLSchema } from "graphql";
import { parse, Kind } from "graphql";
import { logger, reset, blue, magenta, yellow, green, dim } from "./logger";

export type OperationType = "query" | "mutation" | "subscription";
export type ExecutableOp = { kind: "operation"; type: OperationType; name: string };
export type FragmentDef = { kind: "fragment"; name: string };
export type Definition = ExecutableOp | FragmentDef;

/**
 * Load GraphQL schema from TypeScript file exporting `const schema`
 * @param schemaPath Path to schema file
 *
 * @returns SDL string
 */
export async function loadGraphQLSchema(schemaPath: string): Promise<string> {
  const { createJiti } = await import("jiti");
  const jiti = createJiti(import.meta.url, { interopDefault: true });
  const module = (await jiti.import(schemaPath)) as { schema?: GraphQLSchema };
  if (!module.schema) {
    throw new Error(`${schemaPath} must export a 'schema' variable`);
  }
  const { printSchema, lexicographicSortSchema } = await import("graphql");
  return printSchema(lexicographicSortSchema(module.schema));
}

export type DocumentAnalysis = {
  byFile: Map<string, Definition[]>;
  operationsByType: Record<OperationType, ExecutableOp[]>;
};

/**
 * GraphQL documents analysis (strict):
 * - unnamed operations => error
 * - duplicate operation names => error
 * - duplicate fragment names => error
 * - fragments are included for logging only (registry uses operationsByType)
 *
 * @param docs Array of documents with path and content
 *
 * @returns Analysis result
 */
export function analyzeGraphQLDocuments(docs: Array<{ path: string; content: string }>): DocumentAnalysis {
  const byFile = new Map<string, Definition[]>();
  const operationsByType: DocumentAnalysis["operationsByType"] = {
    query: [],
    mutation: [],
    subscription: [],
  };

  const operationNameToFile = new Map<string, string>();
  const fragmentNameToFile = new Map<string, string>();

  for (const doc of docs) {
    const ast = parse(doc.content);
    const defs: Definition[] = [];
    for (const def of ast.definitions) {
      // Fragments
      if (def.kind === Kind.FRAGMENT_DEFINITION) {
        const name = def.name.value;
        const prev = fragmentNameToFile.get(name);
        if (prev) {
          throw new Error(`Duplicate fragment name '${name}' in:\n- ${prev}\n- ${doc.path}`);
        }
        fragmentNameToFile.set(name, doc.path);
        defs.push({ kind: "fragment", name });
        continue;
      }

      // Operations
      if (def.kind !== Kind.OPERATION_DEFINITION) continue;
      const type = def.operation;
      if (!["query", "mutation", "subscription"].includes(type)) continue;
      const name = def.name?.value;
      if (!name) {
        throw new Error(`Unnamed ${type} operation in ${doc.path}`);
      }
      const prev = operationNameToFile.get(name);
      if (prev) {
        throw new Error(`Duplicate ${type} operation name '${name}' in:\n- ${prev}\n- ${doc.path}`);
      }
      operationNameToFile.set(name, doc.path);
      const op: ExecutableOp = { kind: "operation", type, name };
      defs.push(op);
      operationsByType[type].push(op);
    }
    byFile.set(doc.path, defs);
  }
  return { byFile, operationsByType };
}

/**
 * Generate GraphQL document registry source code
 *
 * @param analysis Documents analysis output
 *
 * @returns string Document registry source code
 */
export function generateRegistryByTypeSource(analysis: DocumentAnalysis["operationsByType"]) {
  const queries = analysis.query.map((o) => o.name);
  const mutations = analysis.mutation.map((o) => o.name);
  const subscriptions = analysis.subscription.map((o) => o.name);

  const lines: string[] = [
    `import type { TypedDocumentNode } from "@graphql-typed-document-node/core";`,
    `import * as ops from "#graphql/operations";`,
    ``,
    `type ResultOf<T> = T extends { __apiType?: (variables: infer _) => infer R } ? R : never;`,
    `type VariablesOf<T> = T extends { __apiType?: (variables: infer V) => infer _ } ? V : never;`,
  ];

  // Queries
  if (queries.length > 0) {
    lines.push(
      ``,
      `export const queries = {`,
      ...queries.map((name) => `  ${name}: ops.${name}Document,`),
      `} as const;`,
    );
  }
  else {
    lines.push(``, `export const queries = {} as const;`);
  }
  lines.push(
    `export type QueryName = keyof typeof queries;`,
    `export type QueryResult<N extends QueryName> = ResultOf<(typeof queries)[N]>;`,
    `export type QueryVariables<N extends QueryName> = VariablesOf<(typeof queries)[N]>;`,
  );

  // Mutations
  if (mutations.length > 0) {
    lines.push(
      ``,
      `export const mutations = {`,
      ...mutations.map((name) => `  ${name}: ops.${name}Document,`),
      `} as const;`,
    );
  }
  else {
    lines.push(``, `export const mutations = {} as const;`);
  }
  lines.push(
    `export type MutationName = keyof typeof mutations;`,
    `export type MutationResult<N extends MutationName> = ResultOf<(typeof mutations)[N]>;`,
    `export type MutationVariables<N extends MutationName> = VariablesOf<(typeof mutations)[N]>;`,
  );

  // Subscriptions
  if (subscriptions.length > 0) {
    lines.push(
      ``,
      `export const subscriptions = {`,
      ...subscriptions.map((name) => `  ${name}: ops.${name}Document,`),
      `} as const;`,
    );
  }
  else {
    lines.push(``, `export const subscriptions = {} as const;`);
  }
  lines.push(
    `export type SubscriptionName = keyof typeof subscriptions;`,
    `export type SubscriptionResult<N extends SubscriptionName> = ResultOf<(typeof subscriptions)[N]>;`,
    `export type SubscriptionVariables<N extends SubscriptionName> = VariablesOf<(typeof subscriptions)[N]>;`,
  );

  return lines.join("\n") + "\n";
}

/**
 * Format operations / fragments for log output
 *
 * @param defs Definitions to format
 *
 * @returns Formatted string
 */
export function formatDefinitions(defs: Definition[]): string {
  if (defs.length === 0) return "";
  const colorOf = (def: Definition) => {
    if (def.kind === "fragment") return green;
    switch (def.type) {
      case "query": return blue;
      case "mutation": return magenta;
      case "subscription": return yellow;
    }
  };
  return defs.map((def) => `${colorOf(def)}${def.name}${reset}`).join(`${dim} / ${reset}`);
}

/**
 * Run GraphQL codegen
 *
 * @param options Codegen options
 * @param options.sdl GraphQL schema SDL
 * @param options.documents Array of document file paths
 * @param options.operationsFile Output file path for operations
 *
 * @returns Promise<void>
 */
export async function runCodegen(options: { sdl: string; documents: string[]; operationsFile: string }): Promise<void> {
  const { sdl, documents, operationsFile } = options;
  if (documents.length === 0) {
    logger.warn("No GraphQL documents found");
    return;
  }
  try {
    await generate(
      {
        schema: sdl,
        documents,
        generates: {
          [operationsFile]: {
            plugins: ["typescript", "typescript-operations", "typed-document-node"],
            config: {
              useTypeImports: true,
              enumsAsTypes: true,
              skipTypename: true,
              documentVariableSuffix: "Document",
              documentMode: "documentNode",
              strictScalars: true,
              defaultScalarType: "never",
              // TODO: Make codegen config customizable, e.g. for custom scalars
            },
          },
        },
        silent: true,
        errorsOnly: true,
      },
      true,
    );
    logger.success(`Generated types for ${documents.length} document(s)`);
  }
  catch (error) {
    logger.error("GraphQL codegen failed:", error instanceof Error ? error.message : error);
  }
}
