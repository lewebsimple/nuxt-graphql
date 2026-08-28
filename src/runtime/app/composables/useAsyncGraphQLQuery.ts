import { computed, type Ref, toValue, type MaybeRefOrGetter } from "vue";

import {
  type AsyncData,
  type AsyncDataOptions,
  useAsyncData,
  useNuxtApp,
  useRuntimeConfig,
} from "#app";

import type { NormalizedError } from "../../shared/utils/error";
import type {
  QueryName,
  ResultOf,
  VariablesInputOf,
  VariablesOf,
} from "../../shared/utils/registry";
import {
  getCacheKey,
  getCacheMeta,
  getCacheStore,
  getOrCreatePromise,
  readCachedValue,
  resolveCacheEntry,
  seedCacheEntry,
  shouldUseCached,
  staleWhileRevalidate,
} from "../lib/cache";
import { resolveCacheConfig, type CacheConfig } from "../lib/cache-config";
import { getPersistedEntry, setPersistedEntry } from "../lib/persisted";

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
 * One request per server render, however many callers share the key.
 *
 * Nuxt's default `getCachedData` only consults the payload during hydration; on the server it
 * reads `nuxtApp.static.data`, which is empty outside prerendering. Every additional caller of
 * the same key would therefore re-run the handler as soon as the previous request resolved —
 * `getOrCreatePromise` only dedupes *concurrent* requests, not sequential ones. This default
 * reads the payload entry the first fetch published instead.
 *
 * The `cause` guard is not decorative: with `granularCachedData` (Nuxt's default) this function
 * is also consulted by `refresh()`, which must bypass the payload and hit the network — a
 * mutation's follow-up refresh has to show what the server actually stored.
 *
 * Callers can still pass their own `getCachedData` to override this behavior.
 */
function defaultGetCachedData<T>(
  key: string,
  nuxtApp: ReturnType<typeof useNuxtApp>,
  { cause }: { cause: string },
): T | undefined {
  const payload = nuxtApp.payload.data as Record<string, T | undefined>;

  if (import.meta.server) {
    return cause === "initial" ? payload[key] : undefined;
  }

  // Client side, Nuxt's default minus `static.data` (prerendered routes only): the payload
  // entry during hydration, nothing afterwards.
  return nuxtApp.isHydrating ? payload[key] : undefined;
}

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
  const nuxtApp = useNuxtApp();
  const { $executeOperation } = nuxtApp;
  const {
    transform,
    cache,
    scope = "global",
    getCachedData = defaultGetCachedData,
    ...asyncOptions
  } = options ?? {};

  // Resolve the cache store eagerly: it is bound to `nuxtApp` (one per request on the server) and
  // must be captured synchronously so the async fetch path never needs the Nuxt context back.
  const store = getCacheStore(nuxtApp);

  // Resolve cache configuration
  const { graphql } = useRuntimeConfig().public;
  const cacheConfig = resolveCacheConfig(graphql.cacheConfig, cache);

  // Resolve variables and cache key as computed properties to react to changes
  const resolvedVariables = computed(() => toValue(variables));
  const cacheKey = computed(() =>
    getCacheKey(cacheConfig, scope, operationName, resolvedVariables.value),
  );

  // Nuxt keeps the serializable data in `payload.data` and the reactive per-key state in
  // `_asyncData`, both keyed by the (reactive) cache key. Capturing a single `useNuxtData(...)`
  // ref would bind to the *initial* key forever, so once the variables change (e.g. a pagination
  // `after` cursor) every request would read/write the first key's slot — leaking the first
  // page's data into every subsequent page. Always resolve the slot by the current key instead.
  const payloadData = nuxtApp.payload.data as Record<string, TTransformed | undefined>;
  const asyncDataByKey = (
    nuxtApp as unknown as {
      _asyncData: Record<string, { data: Ref<TTransformed | undefined> } | undefined>;
    }
  )._asyncData;

  // Publish a freshly fetched value to the Nuxt async data slots for an exact key. Both slots are
  // owned by `useAsyncData` and hold the *transformed* result, so `transform` has to be applied
  // here as well: background (SWR) revalidations resolve outside of the `useAsyncData` pipeline and
  // would otherwise write a raw result into the rendered data.
  function publish(key: string, value: ResultOf<TName>): void {
    const transformed = (transform ? transform(value) : value) as TTransformed;
    payloadData[key] = transformed;
    const entry = asyncDataByKey?.[key];
    if (entry) entry.data.value = transformed;
  }

  // Fetch data and update the cache, returning the result
  async function fetchAndCache(): Promise<ResultOf<TName>> {
    const key = cacheKey.value;
    return getOrCreatePromise(
      store,
      key,
      async () => {
        const { data, error } = await $executeOperation({
          operationName,
          // Parsed (output) variables are valid execution input; they are re-validated by the
          // variables schema before the request is sent.
          variables: resolvedVariables.value as VariablesInputOf<TName>,
        });

        if (error) throw error;
        const value = resolveCacheEntry(store, key, data, cacheConfig.ttl);
        if (cacheConfig.ttl != null) {
          setPersistedEntry(key, value, cacheConfig.ttl);
        }
        publish(key, value);
        return value;
      },
      cacheConfig.ttl,
    );
  }

  // Async data handler that implements the caching logic based on the cache configuration policy
  async function handler(): Promise<ResultOf<TName>> {
    const key = cacheKey.value;

    // Hydrate the per-app cache from localStorage before consulting it, so persisted entries
    // survive a reload for the policies that read the cache. The persisted timestamps are kept,
    // so expiration and invalidation treat the hydrated entry exactly like the original.
    if (cacheConfig.policy !== "no-cache" && cacheConfig.ttl != null) {
      const existing = getCacheMeta<ResultOf<TName>>(store, key);
      if (!existing?.hasValue && !existing?.promise) {
        const persisted = await getPersistedEntry<ResultOf<TName>>(key);
        if (persisted) {
          seedCacheEntry(store, key, persisted.value, persisted.createdAt, persisted.expiresAt);
        }
      }
    }

    const meta = getCacheMeta<ResultOf<TName>>(store, key);

    // Read the raw result from the module cache — never from `payload.data[key]`, which holds the
    // transformed value and would be handed back to `useAsyncData` to be transformed a second time.
    const cached = readCachedValue<ResultOf<TName>>(store, key);
    const isCacheValid = shouldUseCached(store, key, cached, meta);

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
    getCachedData,
  });
}
