import type { AsyncData, AsyncDataOptions } from "#app";
import { useAsyncData, useNuxtApp, useRuntimeConfig, onScopeDispose } from "#imports";
import { queries, type QueryName, type QueryResult, type QueryVariables } from "#graphql/registry";
import { cacheGet, cacheSet, dedupeGet, dedupeSet, registerRefresh, initCache, getCacheKey, type CacheOptions } from "../utils/graphql-cache";
import type { IsEmptyObject } from "../../../helpers/is-empty-object";

// Options for GraphQL query execution
export interface UseGraphQLQueryOptions<T> extends AsyncDataOptions<T> {
  cache?: CacheOptions | false;
  headers?: HeadersInit;
}

/**
 * Client-side GraphQL query composable with caching and deduplication
 *
 * @param operationName Query operation name
 * @param args Variables and optional configuration
 * @returns AsyncData object with query result
 */
export function useGraphQLQuery<N extends QueryName>(
  operationName: N,
  ...args: IsEmptyObject<QueryVariables<N>> extends true
    ? [variables?: QueryVariables<N>, options?: UseGraphQLQueryOptions<QueryResult<N>>]
    : [variables: QueryVariables<N>, options?: UseGraphQLQueryOptions<QueryResult<N>>]
): AsyncData<QueryResult<N>, Error | null> {
  const { $graphql } = useNuxtApp();
  const { public: { graphql: { cache: globalCache } } } = useRuntimeConfig();
  const document = queries[operationName];
  const [variables, options] = args;

  // Determine cache settings
  const cacheEnabled = options?.cache !== false && globalCache.enabled;
  const cacheTtl = options?.cache === false ? 0 : (options?.cache?.ttl ?? globalCache.ttl);

  // Initialize cache on first use (client-side only)
  if (import.meta.client && cacheEnabled) {
    initCache(globalCache.storage);
  }

  const key = getCacheKey(operationName, variables);

  // Data fetcher with caching and deduplication
  const fetcher = async (): Promise<QueryResult<N>> => {
    // Check cache first (client-side only)
    if (import.meta.client && cacheEnabled) {
      const cached = await cacheGet<QueryResult<N>>(operationName, variables);
      if (cached) return cached;
    }

    // Check for in-flight request (deduplication)
    const inFlight = dedupeGet(operationName, variables);
    if (inFlight) return inFlight as Promise<QueryResult<N>>;

    // Execute GraphQL request
    const promise = $graphql().request(document, variables, options?.headers) as Promise<QueryResult<N>>;
    dedupeSet(operationName, variables, promise);

    const result = await promise;

    // Store result in cache (client-side only)
    if (import.meta.client && cacheEnabled && cacheTtl) {
      await cacheSet(operationName, variables, result, cacheTtl);
    }

    return result;
  };

  // Extract AsyncDataOptions (exclude custom options)
  const { cache: _cache, headers: _headers, ...asyncDataOptions } = options ?? {};

  const asyncData = useAsyncData(key, fetcher, asyncDataOptions) as AsyncData<QueryResult<N>, Error | null>;

  // Register refresh callback for cache invalidation (client-side only)
  if (import.meta.client) {
    const unregister = registerRefresh(operationName, variables, () => asyncData.refresh());
    onScopeDispose(unregister);
  }

  return asyncData;
}
