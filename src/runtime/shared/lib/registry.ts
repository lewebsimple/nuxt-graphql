import type { DocumentNode } from "graphql";
import { registry, type OperationName } from "#graphql/registry";

/**
 * Internal helper to access a GraphQL operation document.
 *
 * This is the only place where the runtime is allowed to
 * read from the registry directly.
 *
 * @param operationName Operation name from the registry.
 * @returns GraphQL document node.
 */
export function getOperationDocument(operationName: OperationName): DocumentNode {
  const entry = registry[operationName] as { document: DocumentNode } | undefined;
  if (!entry) {
    throw new Error(`Operation "${operationName}" not found in registry.`);
  }
  return entry.document;
}
