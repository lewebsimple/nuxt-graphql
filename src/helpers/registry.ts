import { readFileSync } from "node:fs";
import { parse, Kind } from "graphql";
import { findMultipleFiles, toRelativePath, type GlobPattern } from "./file-operations";

export type OperationType = "query" | "mutation" | "subscription";
export type OperationDef = { kind: "operation"; type: OperationType; name: string; path: string };
export type FragmentDef = { kind: "fragment"; name: string; path: string };
export type RegistryDef = OperationDef | FragmentDef;

export async function getRegistryContent({ layerRootDirs, rootDir, documents }: {
  layerRootDirs: string[];
  rootDir: string;
  documents: GlobPattern;
}) {
  // Load GraphQL documents
  const docs = (await findMultipleFiles(layerRootDirs, documents)).map((path) => ({
    path: toRelativePath(rootDir, path),
    content: readFileSync(path, "utf-8"),
  }));

  // Parse documents to extract fragments and operations definitions
  const parsed = {
    fragments: new Map<string, FragmentDef>(),
    operations: {
      query: new Map<string, OperationDef>(),
      mutation: new Map<string, OperationDef>(),
      subscription: new Map<string, OperationDef>(),
    },
  };
  for (const doc of docs) {
    const ast = parse(doc.content);
    for (const def of ast.definitions) {
      switch (def.kind) {
        // Process fragment definitions
        case Kind.FRAGMENT_DEFINITION: {
          const name = def.name.value;
          const existing = parsed.fragments.get(name);
          if (existing) {
            throw new Error(`Duplicate fragment name ${name} in document ${doc.path} (previously defined in ${existing.path})`);
          }
          parsed.fragments.set(name, { kind: "fragment", name, path: doc.path });
          break;
        }

        // Process operation definitions
        case Kind.OPERATION_DEFINITION: {
          const type = def.operation;
          if (!["query", "mutation", "subscription"].includes(type)) continue;
          const name = def.name?.value;
          if (!name) throw new Error(`Unnamed ${type} operation in document ${doc.path}`);
          const existing = parsed.operations[type].get(name);
          if (existing) {
            throw new Error(`Duplicate operation name ${name} in document ${doc.path} (previously defined in ${existing.path})`);
          }
          parsed.operations[type].set(name, { kind: "operation", type, name, path: doc.path });
          break;
        }
      }
    }
  }

  const content = [
    `import * as ops from "#graphql/typed-documents";`,
    ``,
    `type ResultOf<T> = T extends { __apiType?: (variables: infer _) => infer R } ? R : never;`,
    `type VariablesOf<T> = T extends { __apiType?: (variables: infer V) => infer _ } ? V : never;`,
    ``,
  ];

  // Queries
  const queries = Array.from(parsed.operations.query.values());
  content.push(
    `// Queries`,
    `export const queries = {`,
    ...queries.map(({ name }) => `  ${name}: ops.${name}Document,`),
    `};`,
    `export type QueryName = keyof typeof queries;`,
    `export type QueryResult<N extends QueryName> = ResultOf<(typeof queries)[N]>;`,
    `export type QueryVariables<N extends QueryName> = VariablesOf<(typeof queries)[N]>;`,
    ``,
  );

  // Mutations
  const mutations = Array.from(parsed.operations.mutation.values());
  content.push(
    `// Mutations`,
    `export const mutations = {`,
    ...mutations.map(({ name }) => `  ${name}: ops.${name}Document,`),
    `};`,
    `export type MutationName = keyof typeof mutations;`,
    `export type MutationResult<N extends MutationName> = ResultOf<(typeof mutations)[N]>;`,
    `export type MutationVariables<N extends MutationName> = VariablesOf<(typeof mutations)[N]>;`,
    ``,
  );

  // Subscriptions
  const subscriptions = Array.from(parsed.operations.subscription.values());
  content.push(
    `// Subscriptions`,
    `export const subscriptions = {`,
    ...subscriptions.map(({ name }) => `  ${name}: ops.${name}Document,`),
    `};`,
    `export type SubscriptionName = keyof typeof subscriptions;`,
    `export type SubscriptionResult<N extends SubscriptionName> = ResultOf<(typeof subscriptions)[N]>;`,
    `export type SubscriptionVariables<N extends SubscriptionName> = VariablesOf<(typeof subscriptions)[N]>;`,
    ``,
  );

  return content.join("\n");
}
