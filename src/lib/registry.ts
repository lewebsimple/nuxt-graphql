import { Kind } from "graphql";
import type { Source } from "@graphql-tools/utils";

// ────────────────────────────────────────────────────────────────────────────────
// Registry template
// ────────────────────────────────────────────────────────────────────────────────

type RegistryTemplateInput = {
  documents: Source[];
};

/**
 * Render the operation registry module / types from GraphQL documents.
 *
 * @param {RegistryTemplateInput} options Registry template input.
 * @param options.documents Parsed GraphQL documents.
 * @returns Generated TypeScript source for the registry module.
 */
export async function renderRegistryTemplate({ documents }: RegistryTemplateInput): Promise<{ module: string; types: string }> {
  const operations = collectOperations(documents);

  const module = `
import {
  ${operations.map(({ name }) => `${name}Document`).join(",\n  ")}
} from "./operations";

export const registry = {
  ${operations.map(({ name, kind }) => `${name}: { kind: "${kind}", document: ${name}Document },`).join("\n  ")}
};`.trim();

  const types = `
import type { DocumentNode } from "graphql";
import type {
  ${operations.map(({ name, kind }) => `${name}${capitalize(kind)}Variables, ${name}${capitalize(kind)}Result,`).join("\n  ")}
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
  ${operations.map(({ name, kind }) => `${name}: OperationEntry<${name}${capitalize(kind)}Variables, ${name}${capitalize(kind)}Result, "${kind}">;`).join("\n  ")}
};

// Operation name types
export type OperationName = keyof OperationRegistry;
export type QueryName = { [K in keyof OperationRegistry]: OperationRegistry[K]["kind"] extends "query" ? K : never }[keyof OperationRegistry];
export type MutationName = { [K in keyof OperationRegistry]: OperationRegistry[K]["kind"] extends "mutation" ? K : never }[keyof OperationRegistry];
export type SubscriptionName = { [K in keyof OperationRegistry]: OperationRegistry[K]["kind"] extends "subscription" ? K : never }[keyof OperationRegistry];

// Projection helpers (variables / result)
export type VariablesOf<TName extends keyof OperationRegistry> = OperationRegistry[TName]["variables"];
export type ResultOf<TName extends keyof OperationRegistry> = OperationRegistry[TName]["result"];

declare module "#graphql/registry" {
  export const registry: { [K in keyof OperationRegistry]: { kind: OperationRegistry[K]["kind"]; document: DocumentNode; }; };
  export type { OperationRegistry, OperationName, QueryName, MutationName, SubscriptionName, VariablesOf, ResultOf };
}`.trim();

  return { module, types };
}

// ────────────────────────────────────────────────────────────────────────────────
// Registry helpers
// ────────────────────────────────────────────────────────────────────────────────

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
      operations.set(name, { name, kind: def.operation });
    }
  }
  return Array.from(operations.values());
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
