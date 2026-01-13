import type { AsyncDataOptions } from "#app";
import { computed, toValue, useAsyncData, useNuxtApp, useNuxtData, useRuntimeConfig, type MaybeRefOrGetter } from "#imports";
// @ts-expect-error Types available at runtime
import { queries, type QueryName, type QueryResult, type QueryVariables } from "#graphql/registry";
import { resolveCacheConfig, type CacheConfig } from "../lib/cache-config";
import { getCacheKeyParts, getInFlightRequests } from "../lib/graphql-cache";
import { getPersistedEntry, setPersistedEntry } from "../lib/persisted";

// useGraphQLQuery composable options (extends useAsyncData options)
export interface UseGraphQLQueryOptions<T> extends AsyncDataOptions<T> {
  headers?: HeadersInit;
  cache?: Partial<CacheConfig>;
}

export function useGraphQLQuery<N extends QueryName>(
  operationName: N,
  ...args: IsEmptyObject<QueryVariables<N>> extends true
    ? [variables?: MaybeRefOrGetter<QueryVariables<N>>, options?: UseGraphQLQueryOptions<QueryResult<N>>]
    : [variables: MaybeRefOrGetter<QueryVariables<N>>, options?: UseGraphQLQueryOptions<QueryResult<N>>]
): ReturnType<typeof useAsyncData<QueryResult<N>>> {
  const { $getGraphQLClient } = useNuxtApp();
  const inFlightRequests = getInFlightRequests();

  // Initialize query parameters
  const isClient = import.meta.client;
  const { public: { graphql: { cacheConfig: runtimeCacheConfig } } } = useRuntimeConfig();
  const document = queries[operationName];
  const [variables, options] = args;
  const { headers, cache, ...asyncDataOptions } = options ?? {};

  // Resolve cache configuration
  const cacheConfig = resolveCacheConfig(runtimeCacheConfig, cache);

  // Reactive cache key based on operation name and variables
  const cacheKey = computed(() => getCacheKeyParts(cacheConfig, operationName, toValue(variables)).key);

  // Promise to execute the network request with deduplication and optional persistence
  async function executeNetwork() {
    // Check for existing in-flight request
    const existing = inFlightRequests.get(cacheKey.value);
    if (existing) {
      return existing as Promise<QueryResult<N>>;
    }

    // GraphQL request execution promise with optional persistence on client
    const promise = ($getGraphQLClient().request(document, toValue(variables), headers) as Promise<QueryResult<N>>)
      .then((result) => {
        if (isClient && cacheConfig.ttl !== undefined) {
          setPersistedEntry(cacheKey.value, result, cacheConfig.ttl);
        }
        return result;
      });

    // Store in-flight request promise until settled
    inFlightRequests.set(cacheKey.value, promise);
    promise.finally(() => {
      inFlightRequests.delete(cacheKey.value);
    });

    return promise;
  };

  // GraphQL query async data handler with caching logic
  async function asyncDataHandler() {
    const nuxtData = useNuxtData<QueryResult<N>>(cacheKey.value);
    let cachedValue = nuxtData.data.value;

    // Bypass cache if disabled
    if (cacheConfig.cachePolicy === "no-cache") {
      return await executeNetwork();
    }

    // Seed from persisted cache on client if enabled and no in-memory value
    if (isClient && cachedValue === undefined && cacheConfig.ttl !== undefined) {
      const persisted = await getPersistedEntry<QueryResult<N>>(cacheKey.value);
      if (persisted !== undefined) {
        cachedValue = nuxtData.data.value = persisted;
      }
    }

    // Apply cache policy
    switch (cacheConfig.cachePolicy) {
      // Cache-first: return cached value if exists, else fetch from network
      case "cache-first": {
        if (cachedValue !== undefined) {
          return cachedValue;
        }
        return await executeNetwork();
      }

      // Network-first: try network request, fallback to cache on error
      case "network-first": {
        try {
          return await executeNetwork();
        }
        catch (error) {
          if (cachedValue !== undefined) {
            return cachedValue;
          }
          throw error;
        }
      }

      // Stale-while-revalidate: return cached value if exists, then revalidate in background
      case "swr": {
        if (cachedValue !== undefined) {
          // Trigger background revalidation if not already in-flight
          if (!inFlightRequests.has(cacheKey.value)) {
            executeNetwork().then((result) => {
              nuxtData.data.value = result;
            }).catch(() => {
              // Ignore errors
            });
          }
          return cachedValue;
        }
        return await executeNetwork();
      }

      default:
        return await executeNetwork();
    }
  }

  // Use useAsyncData with the fetcher and cache key
  return useAsyncData(cacheKey, asyncDataHandler, asyncDataOptions) as ReturnType<typeof useAsyncData<QueryResult<N>>>;
}
