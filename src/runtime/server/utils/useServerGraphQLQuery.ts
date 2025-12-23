import type { H3Event } from "h3";
import { getGraphQLClient } from "./graphql-client";
import { queries, type QueryName, type QueryResult, type QueryVariables } from "#graphql/registry";
import type { IsEmptyObject } from "../../utils/helpers";

/**
 * Server-side GraphQL query composable
 *
 * @param event H3 event
 * @param operationName Query operation name
 * @param args Variables and optional headers
 * @returns Query result
 */
export async function useServerGraphQLQuery<N extends QueryName>(
  event: H3Event,
  operationName: N,
  ...args: IsEmptyObject<QueryVariables<N>> extends true
    ? [variables?: QueryVariables<N>, headers?: HeadersInit]
    : [variables: QueryVariables<N>, headers?: HeadersInit]
): Promise<QueryResult<N>> {
  const client = getGraphQLClient(event);
  const [variables, headers] = args;

  return client.request(queries[operationName], variables, headers) as Promise<QueryResult<N>>;
}
