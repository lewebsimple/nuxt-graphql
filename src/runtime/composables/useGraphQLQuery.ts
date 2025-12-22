import type { AsyncData, AsyncDataOptions } from "#app";
import { useAsyncData } from "#imports";
import { hash } from "ohash";

import { useGraphQL } from "./useGraphQL";
import { queries, type QueryName, type QueryResult, type QueryVariables } from "#graphql/registry";
import type { IsEmptyObject } from "../utils/helpers";

export function useGraphQLQuery<N extends QueryName>(
  operationName: N,
  ...args: IsEmptyObject<QueryVariables<N>> extends true
    ? [variables?: QueryVariables<N>, opts?: AsyncDataOptions<QueryResult<N>>]
    : [variables: QueryVariables<N>, opts?: AsyncDataOptions<QueryResult<N>>]
): AsyncData<QueryResult<N>, Error | null> {
  const document = queries[operationName];
  const [variables, opts] = args;
  const { request } = useGraphQL();

  const key = `graphql:query:${operationName}:${hash(variables ?? {})}`;

  return useAsyncData(key, () => request(document, variables) as Promise<QueryResult<N>>, opts) as AsyncData<QueryResult<N>, Error | null>;
}
