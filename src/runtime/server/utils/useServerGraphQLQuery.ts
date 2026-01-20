import type { H3Event } from "h3";
import type { QueryName, VariablesOf, ResultOf } from "#graphql/registry";
import { executeGraphQLSchema } from "../lib/execute-schema";
import { normalizeError, type SafeResult } from "../../shared/lib/error";
import type { IsEmptyObject } from "../../shared/lib/utils";

/**
 * Execute a GraphQL query against the local stitched schema (server-side).
 *
 * - Schema execution only (no HTTP)
 * - Context comes from the H3 event
 * - Errors are normalized
 *
 * @param event H3 event used to create context.
 * @param operationName Operation name from the registry.
 * @param variables Operation variables.
 * @returns SafeResult containing data or a normalized error.
 */
export async function useServerGraphQLQuery<TName extends QueryName>(
  event: H3Event,
  operationName: TName,
  ...args: IsEmptyObject<VariablesOf<TName>> extends true
    ? [variables?: VariablesOf<TName>]
    : [variables: VariablesOf<TName>]
): Promise<SafeResult<ResultOf<TName>>> {
  const [variables] = args;
  try {
    const data = await executeGraphQLSchema(
      event,
      operationName,
      variables as VariablesOf<TName>,
    );
    return { data, error: null };
  }
  catch (err) {
    return {
      data: null,
      error: normalizeError(err),
    };
  }
}
