import type { H3Event } from "h3";
import type { QueryName, VariablesOf, ResultOf, MutationName } from "#graphql/registry";
import { executeGraphQLSchema } from "../lib/execute-graphql-schema";
import { normalizeError } from "../../shared/lib/error";
import { getOperationDocument } from "../../shared/lib/registry";
import type { ExecuteGraphQLResult, IsEmptyObject } from "../../shared/lib/types";

/**
 * Execute a GraphQL query or mutation against the local stitched schema (server-side).
 *
 * - Schema execution only (no HTTP)
 * - Context comes from the H3 event
 * - Errors are normalized
 *
 * @param event H3 event used to create context.
 * @param operationName Operation name from the registry.
 * @param args Operation variables (if any).
 * @returns ExecuteGraphQLResult containing data or a normalized error.
 */
export async function useGraphQLOperation<TName extends QueryName | MutationName>(
  event: H3Event,
  operationName: TName,
  ...args: IsEmptyObject<VariablesOf<TName>> extends true
    ? [variables?: VariablesOf<TName>]
    : [variables: VariablesOf<TName>]
): Promise<ExecuteGraphQLResult<ResultOf<TName>>> {
  const [variables] = args;
  try {
    const document = getOperationDocument(operationName);
    return await executeGraphQLSchema<ResultOf<TName>, VariablesOf<TName>>(event, { query: document, variables, operationName });
  }
  catch (err) {
    return { data: null, error: normalizeError(err) };
  }
}
