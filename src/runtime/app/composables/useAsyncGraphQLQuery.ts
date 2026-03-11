import {
  type AsyncData,
  type AsyncDataOptions,
  useAsyncData,
  useNuxtApp,
  useNuxtData,
  useRuntimeConfig,
} from "#app";
import { computed, toValue, type MaybeRefOrGetter } from "vue";

import type { NormalizedError } from "../../shared/utils/error";
import type { QueryName, ResultOf, VariablesOf } from "../../shared/utils/registry";
import {
  getCacheKey,
  getCacheMeta,
  getOrCreatePromise,
  isExpired,
  resolveCacheEntry,
  shouldBypassCache,
  staleWhileRevalidate,
} from "../lib/cache";
import { resolveCacheConfig, type CacheConfig } from "../lib/cache-config";
import { setPersistedEntry } from "../lib/persisted";

/** Options for the `useAsyncGraphQLQuery` composable based on `AsyncDataOptions` and cache configuration. */
type UseAsyncGraphQLQueryOptions<TName extends QueryName, TTransformed = ResultOf<TName>> = Omit<
  AsyncDataOptions<ResultOf<TName>, TTransformed, never>,
  "transform" | "pick" | "dedupe"
> & {
  transform?: (input: ResultOf<TName>) => TTransformed;
  cache?: Partial<CacheConfig>;
  scope?: string;
};

/**
 * Execute a GraphQL query with integrated caching and async data handling.
 *
 * @template TName Query operation name.
 * @template TTransformed Type of transformed data returned by the composable.
 * @param operationName GraphQL query operation name.
 * @param variables Variables for the GraphQL query.
 * @param options Options for the composable, including caching and transformation.
 * @returns Async data object containing the query result or error.
 */
export function useAsyncGraphQLQuery<TName extends QueryName, TTransformed = ResultOf<TName>>(
  operationName: TName,
  variables: MaybeRefOrGetter<VariablesOf<TName>>,
  options?: UseAsyncGraphQLQueryOptions<TName, TTransformed>,
): AsyncData<TTransformed | undefined, NormalizedError | undefined> {
  const { $executeOperation } = useNuxtApp();
  const { transform, cache, scope = "global", ...asyncOptions } = options ?? {};

  // Resolve cache configuration
  const { graphql } = useRuntimeConfig().public;
  const cacheConfig = resolveCacheConfig(graphql.cacheConfig, cache);

  // Resolve variables and cache key as computed properties to react to changes
  const resolvedVariables = computed(() => toValue(variables));
  const cacheKey = computed(() =>
    getCacheKey(cacheConfig, scope, operationName, resolvedVariables.value),
  );

  const nuxtData = useNuxtData<ResultOf<TName>>(cacheKey.value);

  // Fetch data and update the cache, returning the result
  async function fetchAndCache(): Promise<ResultOf<TName>> {
    const key = cacheKey.value;
    return getOrCreatePromise(
      key,
      async () => {
        const { data, error } = await $executeOperation({
          operationName,
          variables: resolvedVariables.value,
        });

        if (error) throw error;
        const value = resolveCacheEntry(key, data, cacheConfig.ttl);
        if (cacheConfig.ttl != null) {
          setPersistedEntry(key, value, cacheConfig.ttl);
        }
        nuxtData.data.value = value;
        return value;
      },
      cacheConfig.ttl,
    );
  }

  // Async data handler that implements the caching logic based on the cache configuration policy
  async function handler(): Promise<ResultOf<TName>> {
    const key = cacheKey.value;
    const meta = getCacheMeta<ResultOf<TName>>(key);
    const cached = nuxtData.data.value;

    const isCacheValid =
      cached !== undefined && !shouldBypassCache(key, meta?.createdAt) && !isExpired(meta);

    switch (cacheConfig.policy) {
      case "no-cache":
        return fetchAndCache();

      case "cache-first":
        if (isCacheValid) return cached;
        return fetchAndCache();

      case "network-first":
        try {
          return await fetchAndCache();
        } catch (error) {
          if (isCacheValid) {
            return cached;
          }
          throw error;
        }

      case "swr":
        return staleWhileRevalidate({
          cached: isCacheValid ? cached : undefined,
          fetch: fetchAndCache,
          inFlight: meta?.promise,
        });
    }
  }

  return useAsyncData<ResultOf<TName>, NormalizedError, TTransformed, never>(cacheKey, handler, {
    ...asyncOptions,
    dedupe: "defer",
    transform,
  });
}
