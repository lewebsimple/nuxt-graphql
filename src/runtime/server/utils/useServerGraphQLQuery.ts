import type { H3Event } from "h3";
// @ts-expect-error Types available at runtime
import { queries, type QueryName, type QueryResult, type QueryVariables } from "#graphql/registry";
import { executeServerGraphQL, type ExecuteServerGraphQLOptions } from "../lib/execute-server-graphql";

export async function useServerGraphQLQuery<N extends QueryName>(
  event: H3Event,
  operationName: N,
  ...args: IsEmptyObject<QueryVariables<N>> extends true
    ? [variables?: QueryVariables<N>, options?: ExecuteServerGraphQLOptions]
    : [variables: QueryVariables<N>, options?: ExecuteServerGraphQLOptions]
): Promise<QueryResult<N>> {
  const [variables, options] = args;

  return executeServerGraphQL(event, queries[operationName], variables, options) as Promise<QueryResult<N>>;
}
