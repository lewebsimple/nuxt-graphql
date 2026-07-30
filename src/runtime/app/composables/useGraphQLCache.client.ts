import { refreshNuxtData, useNuxtApp, useNuxtData, useRuntimeConfig } from "#app";

import type { QueryName, ResultOf, VariablesOf } from "../../shared/utils/registry";
import {
  getCacheKey,
  getCacheOperationPrefix,
  getCacheRootPrefix,
  getCacheScopePrefix,
  getCacheStore,
  invalidateAllCache,
  invalidateCachePrefix,
  readCachedValue,
  resolveCacheEntry,
} from "../lib/cache";
import { deletePersistedByPrefix, getPersistedEntry, setPersistedEntry } from "../lib/persisted";

/**
 * Create GraphQL cache helpers for a given scope.
 *
 * @param scope Cache scope namespace.
 * @returns Cache read/write/update/invalidate helpers.
 */
export function useGraphQLCache(scope: string = "global") {
  const { cacheConfig } = useRuntimeConfig().public.graphql;
  const store = getCacheStore(useNuxtApp());

  /**
   * Read a cached query result from in-memory cache.
   *
   * @param operationName Query operation name.
   * @param variables Query variables (optional if empty).
   * @returns Cached value or undefined if not found.
   */
  function read<TName extends QueryName>(
    operationName: TName,
    variables: VariablesOf<TName> = {} as VariablesOf<TName>,
  ): ResultOf<TName> | undefined {
    const key = getCacheKey(cacheConfig, scope, operationName, variables);

    // Prefer the raw query cache; fall back to the Nuxt async data slot for keys that were only
    // ever rendered (e.g. under the `no-cache` policy) and never stored by the query cache.
    const cached = readCachedValue<ResultOf<TName>>(store, key);
    if (cached !== undefined) return cached;

    return useNuxtData<ResultOf<TName>>(key).data.value;
  }

  // Apply a cache write synchronously and register the key
  function applyWrite<TName extends QueryName>(
    key: string,
    value: ResultOf<TName> | ((current: ResultOf<TName> | undefined) => ResultOf<TName>),
    current: ResultOf<TName> | undefined,
  ): ResultOf<TName> {
    const nuxtData = useNuxtData<ResultOf<TName>>(key);
    const next =
      typeof value === "function"
        ? (value as (current: ResultOf<TName> | undefined) => ResultOf<TName>)(current)
        : value;

    // Write to both the query cache (what the cache policies read) and the Nuxt async data slot
    // (what the rendered components read), so an optimistic update is not undone by a later
    // `cache-first` / `swr` read returning the pre-write value.
    resolveCacheEntry(store, key, next, cacheConfig.ttl);
    nuxtData.data.value = next;

    return next;
  }

  /**
   * Write a cached query result synchronously (in-memory only).
   *
   * @param operationName Query operation name.
   * @param variables Query variables.
   * @param value New value or updater function that receives current value.
   */
  function write<TName extends QueryName>(
    operationName: TName,
    variables: VariablesOf<TName>,
    value: ResultOf<TName> | ((current: ResultOf<TName> | undefined) => ResultOf<TName>),
  ): void {
    const key = getCacheKey(cacheConfig, scope, operationName, variables);

    applyWrite<TName>(key, value, read<TName>(operationName, variables));
  }

  /**
   * Update a cached query result asynchronously (in-memory + persisted).
   *
   * @param operationName Query operation name.
   * @param variables Query variables.
   * @param value New value or updater function that receives current value.
   * @returns Promise that resolves when both in-memory and persisted caches are updated.
   */
  async function update<TName extends QueryName>(
    operationName: TName,
    variables: VariablesOf<TName>,
    value: ResultOf<TName> | ((current: ResultOf<TName> | undefined) => ResultOf<TName>),
  ): Promise<void> {
    const key = getCacheKey(cacheConfig, scope, operationName, variables);

    let current = read<TName>(operationName, variables);
    if (current === undefined && cacheConfig.ttl !== undefined) {
      current = (await getPersistedEntry<ResultOf<TName>>(key))?.value;
    }

    const next = applyWrite<TName>(key, value, current);

    if (cacheConfig.ttl !== undefined) {
      await setPersistedEntry(key, next, cacheConfig.ttl);
    }
  }

  /**
   * Invalidate cached query results.
   *
   * @param scope Optional scope to invalidate.
   * @param operationName Optional query operation name within the scope.
   */
  async function invalidate<TName extends QueryName>(
    scope?: string,
    operationName?: TName,
  ): Promise<void> {
    // Invalidate everything
    if (scope === undefined) {
      const rootPrefix = getCacheRootPrefix(cacheConfig);
      invalidateAllCache(store);
      await deletePersistedByPrefix(rootPrefix);
      await refreshNuxtData();
      return;
    }

    // Invalidate entire scope
    if (operationName === undefined) {
      const scopePrefix = getCacheScopePrefix(cacheConfig, scope);
      invalidateCachePrefix(store, scopePrefix);
      await deletePersistedByPrefix(scopePrefix);
      await refreshNuxtData();
      return;
    }

    // Invalidate specific operation
    const opPrefix = getCacheOperationPrefix(cacheConfig, scope, operationName);
    invalidateCachePrefix(store, opPrefix);
    await deletePersistedByPrefix(opPrefix);
    await refreshNuxtData();
  }

  return {
    cacheConfig,
    read,
    write,
    update,
    invalidate,
  } as const;
}
