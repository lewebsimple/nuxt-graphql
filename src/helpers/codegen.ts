import { readFileSync } from "node:fs";
import { generate, type CodegenConfig } from "@graphql-codegen/cli";
import type { GraphQLSchema } from "graphql";
import { parse, Kind } from "graphql";
import { writeFileIfChanged } from "./file-operations";
import { reset, blue, magenta, yellow, green, dim } from "./logger";

/**
 * Load GraphQL schema SDL from TypeScript file exporting `const schema`
 *
 * @param schemaPath Path to schema file
 * @returns SDL string
 */
export async function loadSchemaSdl(schemaPath: string): Promise<string> {
  const { createJiti } = await import("jiti");
  const jiti = createJiti(import.meta.url, { interopDefault: true });
  const module = (await jiti.import(schemaPath)) as { schema?: GraphQLSchema };

  if (!module.schema) {
    throw new Error(`${schemaPath} must export a 'schema' variable`);
  }

  const { printSchema, lexicographicSortSchema } = await import("graphql");
  return printSchema(lexicographicSortSchema(module.schema));
}

export type ScalarConfig = string | { input: string; output: string };

/**
 * Run GraphQL code generation
 */
export async function runCodegen({ schema, documents, operationsPath, zodPath, scalars }: {
  schema: string;
  documents: string[];
  operationsPath: string;
  zodPath?: string;
  scalars?: Record<string, ScalarConfig>;
}): Promise<void> {
  // Configure TypeScript operations generation
  const generates: CodegenConfig["generates"] = {
    [operationsPath]: {
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

  // Add Zod generation if requested
  if (zodPath) {
    const zodScalars: Record<string, string> = {};
    if (scalars) {
      // Map TypeScript types to Zod schemas with coercion
      for (const [name, config] of Object.entries(scalars)) {
        const inputType = typeof config === "string" ? config : config.input;
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
    generates[zodPath] = {
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
  }

  await generate({ generates, silent: true, errorsOnly: true }, true);
}

// Type definitions for GraphQL operation analysis
export type OperationType = "query" | "mutation" | "subscription";
export type ExecutableOp = { kind: "operation"; type: OperationType; name: string };
export type FragmentDef = { kind: "fragment"; name: string };
export type Definition = ExecutableOp | FragmentDef;

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
 * @param documents Array of GraphQL documents paths
 * @returns Analysis result
 */
export function analyzeDocuments(documents: string[]): DocumentAnalysis {
  const docs = documents.map((path) => ({ path, content: readFileSync(path, "utf-8") }));
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

/**
 * Generate GraphQL document registry source code
 *
 * @param registryPath Output path for registry module
 * @param operationsByType Operations grouped by type
 *
 * @returns Document registry source code
 */
export function writeRegistryModule({ registryPath, operationsByType }: {
  registryPath: string;
  operationsByType: DocumentAnalysis["operationsByType"];
}): boolean {
  const queries = operationsByType.query.map((o) => o.name);
  const mutations = operationsByType.mutation.map((o) => o.name);
  const subscriptions = operationsByType.subscription.map((o) => o.name);

  // Base imports and type helpers
  const content = [
    `import type { TypedDocumentNode } from "@graphql-typed-document-node/core";`,
    `import * as ops from "#graphql/operations";`,
    ``,
    `type ResultOf<T> = T extends { __apiType?: (variables: infer _) => infer R } ? R : never;`,
    `type VariablesOf<T> = T extends { __apiType?: (variables: infer V) => infer _ } ? V : never;`,
  ];

  // Generate queries
  if (queries.length > 0) {
    content.push(
      ``,
      `// Queries`,
      `export const queries = {`,
      ...queries.map((name) => `  ${name}: ops.${name}Document,`),
      `} as const;`,
    );
  }
  else {
    content.push(``, `export const queries = {} as const;`);
  }
  content.push(
    ``,
    `export type QueryName = keyof typeof queries;`,
    `export type QueryResult<N extends QueryName> = ResultOf<(typeof queries)[N]>;`,
    `export type QueryVariables<N extends QueryName> = VariablesOf<(typeof queries)[N]>;`,
  );

  // Generate mutations
  if (mutations.length > 0) {
    content.push(
      ``,
      `// Mutations`,
      `export const mutations = {`,
      ...mutations.map((name) => `  ${name}: ops.${name}Document,`),
      `} as const;`,
    );
  }
  else {
    content.push(``, `export const mutations = {} as const;`);
  }
  content.push(
    ``,
    `export type MutationName = keyof typeof mutations;`,
    `export type MutationResult<N extends MutationName> = ResultOf<(typeof mutations)[N]>;`,
    `export type MutationVariables<N extends MutationName> = VariablesOf<(typeof mutations)[N]>;`,
  );

  // Generate subscriptions
  if (subscriptions.length > 0) {
    content.push(
      ``,
      `// Subscriptions`,
      `export const subscriptions = {`,
      ...subscriptions.map((name) => `  ${name}: ops.${name}Document,`),
      `} as const;`,
    );
  }
  else {
    content.push(``, `export const subscriptions = {} as const;`);
  }
  content.push(
    ``,
    `export type SubscriptionName = keyof typeof subscriptions;`,
    `export type SubscriptionResult<N extends SubscriptionName> = ResultOf<(typeof subscriptions)[N]>;`,
    `export type SubscriptionVariables<N extends SubscriptionName> = VariablesOf<(typeof subscriptions)[N]>;`,
  );

  return writeFileIfChanged(registryPath, content.join("\n") + "\n");
}
