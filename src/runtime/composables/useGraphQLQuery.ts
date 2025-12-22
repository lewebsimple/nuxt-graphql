import type { AsyncData, AsyncDataOptions } from "#app";
import { useAsyncData, useNuxtApp } from "#imports";
import { hash } from "ohash";

import { queries, type QueryName, type QueryResult, type QueryVariables } from "#graphql/registry";
import type { IsEmptyObject } from "../utils/helpers";

export function useGraphQLQuery<N extends QueryName>(
  operationName: N,
  ...args: IsEmptyObject<QueryVariables<N>> extends true
    ? [variables?: QueryVariables<N>, options?: AsyncDataOptions<QueryResult<N>>]
    : [variables: QueryVariables<N>, options?: AsyncDataOptions<QueryResult<N>>]
): AsyncData<QueryResult<N>, Error | null> {
  const { $graphql } = useNuxtApp();
  const document = queries[operationName];
  const [variables, options] = args;
  const key = `graphql:query:${operationName}:${hash(variables ?? {})}`;
  return useAsyncData(key, () => $graphql().request({ document, variables }) as Promise<QueryResult<N>>, options) as AsyncData<QueryResult<N>, Error | null>;
}
