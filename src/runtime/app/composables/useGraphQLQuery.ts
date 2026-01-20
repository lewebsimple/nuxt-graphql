import type { QueryName, ResultOf, VariablesOf } from "#graphql/registry";
import { executeGraphQLHTTP, type ExecuteGraphQLHTTPOptions } from "../lib/execute-http";
import { normalizeError, type SafeResult } from "../../shared/lib/error";
import { getInFlightKey, getInFlightRequests } from "../lib/in-flight";
import type { IsEmptyObject } from "../../shared/lib/utils";

/**
 * Execute a GraphQL query over HTTP with in-flight deduplication.
 *
 * @param operationName Operation name from the registry.
 * @returns SafeResult containing data or a normalized error.
 */
export async function useGraphQLQuery<TName extends QueryName>(
  operationName: TName,
  ...args: IsEmptyObject<VariablesOf<TName>> extends true
    ? [variables?: VariablesOf<TName>, options?: ExecuteGraphQLHTTPOptions]
    : [variables: VariablesOf<TName>, options?: ExecuteGraphQLHTTPOptions]
): Promise<SafeResult<ResultOf<TName>>> {
  const [variables, options] = args;

  // Dedupe in-flight requests for queries
  const inFlight = getInFlightRequests();
  const key = getInFlightKey(operationName, variables);
  if (inFlight.has(key)) {
    return inFlight.get(key) as Promise<SafeResult<ResultOf<TName>>>;
  }

  // Execute GraphQL HTTP request with error normalization
  const promise = (async (): Promise<SafeResult<ResultOf<TName>>> => {
    try {
      const data = await executeGraphQLHTTP(operationName, variables, options);
      return { data, error: null };
    }
    catch (err) {
      return { data: null, error: normalizeError(err) };
    }
    finally {
      inFlight.delete(key);
    }
  })();

  // Store in-flight request
  if (inFlight && key) {
    inFlight.set(key, promise);
  }

  return promise;
}
