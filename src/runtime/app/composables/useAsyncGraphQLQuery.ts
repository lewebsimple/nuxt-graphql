import { useAsyncData, useNuxtApp, useNuxtData, useRuntimeConfig, type AsyncData, type AsyncDataOptions } from "#app";
import type { QueryName, ResultOf, VariablesOf } from "#graphql/registry";
import { computed, toValue, watchEffect, type MaybeRefOrGetter } from "#imports";
import type { NormalizedError } from "../../shared/lib/error";
import { normalizeError } from "../../shared/lib/error";
import { getOperationDocument } from "../../shared/lib/registry";
import type { CacheConfig, IsEmptyObject } from "../../shared/lib/types";
import { getCacheKeyParts, markCacheKeyRefreshed, registerCacheKey, resolveCacheConfig, shouldBypassCache } from "../lib/cache";
import { getInFlightRequests } from "../lib/in-flight";
import { getPersistedEntry, setPersistedEntry } from "../lib/persisted";

type UseAsyncGraphQLQueryOptions<TName extends QueryName, TTransformed = ResultOf<TName>> = Omit<AsyncDataOptions<ResultOf<TName>>, "transform" | "pick"> & {
  transform?: (input: ResultOf<TName>) => TTransformed;
  cache?: Partial<CacheConfig>;
  scope?: string;
};

/**
 * Async GraphQL query composable with caching support.
 *
 * @param operationName Operation name from the registry.
 * @param args Operation variables (if any) and optional HTTP headers.
 * @returns Nuxt AsyncData wrapper for the query result.
 */
export function useAsyncGraphQLQuery<
  TName extends QueryName,
  TTransformed extends ResultOf<TName> | Promise<ResultOf<TName>> = ResultOf<TName>,
>(
  operationName: TName,
  ...args: IsEmptyObject<VariablesOf<TName>> extends true
    ? [variables?: MaybeRefOrGetter<VariablesOf<TName>>, options?: UseAsyncGraphQLQueryOptions<TName, TTransformed>]
    : [variables: MaybeRefOrGetter<VariablesOf<TName>>, options?: UseAsyncGraphQLQueryOptions<TName, TTransformed>]
): AsyncData<TTransformed | undefined, NormalizedError | undefined> {
  const { $executeGraphQL } = useNuxtApp();
  const [variables, options] = args;
  const document = getOperationDocument(operationName);

  const isClient = import.meta.client;
  const { public: { graphql } } = useRuntimeConfig();
  const { cache, transform, scope: scopeOpt, ...asyncDataOptions } = options ?? {};

  // Resolve cache config and reactive cache key
  const cacheConfig = resolveCacheConfig(graphql.cacheConfig, cache);
  const scope = scopeOpt ?? "global";
  const cacheKey = computed(() => getCacheKeyParts(cacheConfig, scope, operationName, toValue(variables)).key);
  watchEffect(() => {
    registerCacheKey(cacheKey.value);
  });

  // Promise to execute the network request with deduplication and optional persistence
  const inFlight = getInFlightRequests();

  // Execute the network request with deduplication and optional persistence.
  async function fetchAndPersist(): Promise<ResultOf<TName>> {
    // Check for existing in-flight request with same cache key
    const key = cacheKey.value;
    if (inFlight.has(key)) {
      return inFlight.get(key) as Promise<ResultOf<TName>>;
    }

    // GraphQL request execution promise with optional persistence on client
    const promise = $executeGraphQL<ResultOf<TName>, VariablesOf<TName>>({ query: document, variables: toValue(variables), operationName })
      .then(({ data, error }) => {
        if (error) {
          throw error;
        }
        if (isClient && cacheConfig.ttl !== undefined) {
          setPersistedEntry(key, data, cacheConfig.ttl);
        }
        markCacheKeyRefreshed(key);
        return data;
      });

    // Store in-flight request promise until settled
    inFlight.set(key, promise);
    promise.finally(() => inFlight.delete(key));

    return promise;
  }

  // AsyncData handler that applies the configured cache policy.
  async function asyncDataHandler() {
    registerCacheKey(cacheKey.value);

    // Bypass cache if disabled or if cacheKey is marked for bypass (e.g. after mutation)
    if (cacheConfig.policy === "no-cache" || shouldBypassCache(cacheKey.value)) {
      return await fetchAndPersist();
    }

    // Initialize in-memory cache from useNuxtData
    const nuxtData = useNuxtData<ResultOf<TName>>(cacheKey.value);
    let cachedValue = nuxtData.data.value;

    // Seed from persisted cache on client if enabled and no in-memory value
    if (isClient && cachedValue === undefined && cacheConfig.ttl !== undefined) {
      const persisted = await getPersistedEntry<ResultOf<TName>>(cacheKey.value);
      if (persisted !== undefined) {
        cachedValue = nuxtData.data.value = persisted;
      }
    }

    // Apply cache policy
    switch (cacheConfig.policy) {
      // Cache-first: return cached value if exists, else fetch from network
      case "cache-first": {
        if (cachedValue !== undefined) {
          return cachedValue;
        }
        return await fetchAndPersist();
      }

      // Network-first: try network request, fallback to cache on error
      case "network-first": {
        try {
          return await fetchAndPersist();
        }
        catch (error) {
          if (cachedValue !== undefined) {
            return cachedValue;
          }
          throw normalizeError(error);
        }
      }

      // Stale-while-revalidate: return cached value if exists, then revalidate in background
      case "swr": {
        if (cachedValue !== undefined) {
          // Trigger background revalidation if not already in-flight for this cache key
          if (!inFlight.has(cacheKey.value)) {
            fetchAndPersist().then((result) => {
              nuxtData.data.value = result;
            }).catch(() => {
              // Ignore errors
            });
          }
          return cachedValue;
        }
        return await fetchAndPersist();
      }

      default:
        throw normalizeError(new Error(`Unknown cache policy: ${cacheConfig.policy}`));
    }
  }

  return useAsyncData(cacheKey, asyncDataHandler, { ...asyncDataOptions, transform }) as AsyncData<TTransformed | undefined, NormalizedError | undefined>;
}
