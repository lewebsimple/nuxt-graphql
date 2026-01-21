import { Kind } from "graphql";
import type { Source } from "@graphql-tools/utils";

type RegistryTemplateInput = {
  documents: Source[];
};

/**
 * Render the operation registry module from GraphQL documents.
 *
 * @param {RegistryTemplateInput} options Registry template input.
 * @param options.documents Parsed GraphQL documents.
 * @returns Generated TypeScript source for the registry module.
 */
export async function renderRegistryTemplate({ documents }: RegistryTemplateInput): Promise<string> {
  const operations = collectOperations(documents);
  return `
import type { DocumentNode } from "graphql";,
import {
${operations.map(({ name }) => `  ${name}Document, type ${name}QueryVariables, type ${name}QueryResult,`).join("\n")},
} from "./operations";

// Operation entry
export interface OperationEntry<TVariables, TResult, TKind extends "query" | "mutation" | "subscription"> {
  kind: TKind;
  variables: TVariables;
  result: TResult;
  document: DocumentNode;
}

// Operation registry type
export type OperationRegistry = {
${operations.map(({ name, kind }) => `  ${name}: OperationEntry<${name}QueryVariables, ${name}QueryResult, "${kind}">;`).join("\n")}
};

// Operation name types
export type QueryName = { [K in keyof OperationRegistry]: OperationRegistry[K]["kind"] extends "query" ? K : never }[keyof OperationRegistry];
export type MutationName = { [K in keyof OperationRegistry]: OperationRegistry[K]["kind"] extends "mutation" ? K : never }[keyof OperationRegistry];
export type SubscriptionName = { [K in keyof OperationRegistry]: OperationRegistry[K]["kind"] extends "subscription" ? K : never }[keyof OperationRegistry];

// Projection helpers (variables / result)
export type VariablesOf<TName extends keyof OperationRegistry> = OperationRegistry[TName]["variables"];
export type ResultOf<TName extends keyof OperationRegistry> = OperationRegistry[TName]["result"];


// Runtime registry (document + kind only)
export const registry: { [K in keyof OperationRegistry]: { kind: OperationRegistry[K]["kind"]; document: DocumentNode; }; } = {
  ${operations.map(({ name, kind }) => `  ${name}: { kind: "${kind}", document: ${name}Document}}, `).join("\n")}
};`.trim();
}

type OperationMeta = {
  name: string;
  kind: "query" | "mutation" | "subscription";
};

/**
 * Extract unique operation metadata from GraphQL documents.
 *
 * @param documents Parsed GraphQL documents.
 * @returns Operation metadata entries.
 */
function collectOperations(documents: Source[]): OperationMeta[] {
  const operations = new Map<string, OperationMeta>();
  for (const source of documents) {
    const doc = source.document;
    if (!doc) continue;
    for (const def of doc.definitions) {
      if (def.kind !== Kind.OPERATION_DEFINITION) continue;
      const name = def.name?.value;
      if (!name) {
        throw new Error("Anonymous GraphQL operations are not allowed");
      }
      if (operations.has(name)) {
        throw new Error(`Duplicate GraphQL operation name "${name}"`);
      }
      operations.set(name, {
        name,
        kind: def.operation,
      });
    }
  }
  return [...operations.values()];
}
