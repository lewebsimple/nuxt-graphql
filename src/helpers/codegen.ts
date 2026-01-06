import { generate, type CodegenConfig } from "@graphql-codegen/cli";
import type { GraphQLSchema } from "graphql";
import { parse, Kind } from "graphql";
import { logger, reset, blue, magenta, yellow, green, dim } from "./logger";

// Type definitions for GraphQL operation analysis
export type OperationType = "query" | "mutation" | "subscription";
export type ExecutableOp = { kind: "operation"; type: OperationType; name: string };
export type FragmentDef = { kind: "fragment"; name: string };
export type Definition = ExecutableOp | FragmentDef;

/**
 * Load GraphQL schema from TypeScript file exporting `const schema`
 *
 * @param schemaPath Path to schema file
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
 * GraphQL documents analysis (strict validation):
 * - Unnamed operations result in error
 * - Duplicate operation names result in error
 * - Duplicate fragment names result in error
 * - Fragments are included for logging only (registry uses operationsByType)
 *
 * @param docs Array of documents with path and content
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
      // Handle fragment definitions
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

      // Handle operation definitions
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
 * @returns Document registry source code
 */
export function generateRegistryByTypeSource(analysis: DocumentAnalysis["operationsByType"]) {
  const queries = analysis.query.map((o) => o.name);
  const mutations = analysis.mutation.map((o) => o.name);
  const subscriptions = analysis.subscription.map((o) => o.name);

  // Build base imports and type helpers
  const lines: string[] = [
    `import type { TypedDocumentNode } from "@graphql-typed-document-node/core";`,
    `import * as ops from "#graphql/operations";`,
    ``,
    `type ResultOf<T> = T extends { __apiType?: (variables: infer _) => infer R } ? R : never;`,
    `type VariablesOf<T> = T extends { __apiType?: (variables: infer V) => infer _ } ? V : never;`,
  ];

  // Generate queries registry and types
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

  // Generate mutations registry and types
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

  // Generate subscriptions registry and types
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
 * Format operations and fragments for log output
 *
 * @param defs Definitions to format
 * @returns Formatted string with ANSI colors
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

export type ScalarConfig = string | { input: string; output: string };

export interface CodegenOptions {
  schema: string;
  documents: string[];
  operationsFile: string;
  schemasFile?: string;
  scalars?: Record<string, ScalarConfig>;
  generates?: CodegenConfig["generates"];
}

/**
 * Run GraphQL code generation
 *
 * @param options Codegen options
 */
export async function runCodegen(options: CodegenOptions): Promise<void> {
  const { schema, documents, operationsFile, schemasFile, scalars, generates: customGenerates } = options;

  if (documents.length === 0) {
    logger.warn("No GraphQL documents found");
    return;
  }

  // Build Zod scalar mappings for validation (with coercion)
  const zodScalars: Record<string, string> = {};

  if (scalars) {
    for (const [name, config] of Object.entries(scalars)) {
      const inputType = typeof config === "string" ? config : config.input;

      // Map TypeScript types to Zod schemas with coercion
      switch (inputType) {
        case "Date":
          zodScalars[name] = "z.coerce.date()";
          break;
        case "number":
          zodScalars[name] = "z.coerce.number()";
          break;
        case "boolean":
          zodScalars[name] = "z.coerce.boolean()";
          break;
        default:
          zodScalars[name] = "z.string()";
      }
    }
  }

  try {
    // Configure TypeScript operations generation
    const generates: CodegenConfig["generates"] = {
      [operationsFile]: {
        schema,
        documents,
        plugins: ["typescript", "typescript-operations", "typed-document-node"],
        config: {
          useTypeImports: true,
          enumsAsTypes: true,
          skipTypename: true,
          documentVariableSuffix: "Document",
          documentMode: "documentNode",
          strictScalars: true,
          defaultScalarType: "never",
          scalars,
        },
      },
    };

    // Add Zod schema generation if requested
    if (schemasFile) {
      generates[schemasFile] = {
        schema,
        documents,
        plugins: ["typescript-validation-schema"],
        config: {
          schema: "zodv4",
          importFrom: "#graphql/operations",
          useTypeImports: true,
          directives: {
            constraint: {
              minLength: "min",
              maxLength: "max",
              pattern: "regex",
            },
          },
          scalarSchemas: zodScalars,
        },
      };

      // Add custom generates if provided
      if (customGenerates) {
        Object.assign(generates, customGenerates);
      }
    }

    await generate({ generates, silent: true, errorsOnly: true }, true);
    logger.success(`Generated types for ${documents.length} document(s)`);
  }
  catch (error) {
    logger.error("GraphQL codegen failed:", error instanceof Error ? error.message : error);
  }
}
