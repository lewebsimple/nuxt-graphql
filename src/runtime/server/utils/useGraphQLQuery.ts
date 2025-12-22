import type { H3Event } from "h3";
import { getGraphQLClient } from "./graphql-client";
import { queries, type QueryName, type QueryResult, type QueryVariables } from "#graphql/registry";
import type { IsEmptyObject } from "../../utils/helpers";

export async function useGraphQLQuery<N extends QueryName>(
  event: H3Event,
  operationName: N,
  ...args: IsEmptyObject<QueryVariables<N>> extends true
    ? [variables?: QueryVariables<N>]
    : [variables: QueryVariables<N>]
): Promise<QueryResult<N>> {
  const client = getGraphQLClient(event);
  const [variables] = args;
  return client.request(queries[operationName], variables) as Promise<QueryResult<N>>;
}
