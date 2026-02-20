import type { QueryName, ResultOf, VariablesOf } from "#graphql/registry";
import { refreshNuxtData, useNuxtData, useRuntimeConfig } from "#imports";
import { getCacheKeyParts, getCacheKeysByPrefix, invalidateAllCacheKeys, invalidateCacheKey, invalidateCachePrefix, markCacheKeyRefreshed, registerCacheKey } from "../lib/cache";
import { deletePersistedByPrefix, deletePersistedEntry, getPersistedEntry, setPersistedEntry } from "../lib/persisted";
import type { IsEmptyObject } from "../../shared/lib/types";

type CacheWriteOptions = { markFresh?: boolean };

/**
 * GraphQL cache helper composable.
 *
 * @returns Cache manipulation helpers.
 */
export function useGraphQLCache() {
  const { public: { graphql: { cacheConfig } } } = useRuntimeConfig();

  /**
   * Read a cached query result from in-memory cache.
   *
   * @param operation Query operation name.
   * @param args Query variables (optional if empty).
   * @returns Cached value or undefined if not found.
   */
  function read<TName extends QueryName>(
    operation: TName,
    ...args: IsEmptyObject<VariablesOf<TName>> extends true
      ? [variables?: VariablesOf<TName>]
      : [variables: VariablesOf<TName>]
  ): ResultOf<TName> | undefined {
    const [variables] = args;
    const { key } = getCacheKeyParts(cacheConfig, operation, variables ?? {});
    const nuxtData = useNuxtData<ResultOf<TName>>(key);
    return nuxtData.data.value;
  }

  /**
   * Write a cached query result synchronously (in-memory only).
   *
   * @param operation Query operation name.
   * @param variables Query variables.
   * @param value New value or updater function that receives current value.
   */
  function write<TName extends QueryName>(
    operation: TName,
    variables: VariablesOf<TName>,
    value: ResultOf<TName> | ((current: ResultOf<TName> | undefined) => ResultOf<TName>),
    options?: CacheWriteOptions,
  ): void {
    const { key } = getCacheKeyParts(cacheConfig, operation, variables);
    const nuxtData = useNuxtData<ResultOf<TName>>(key);

    nuxtData.data.value = typeof value === "function"
      ? (value as (current: ResultOf<TName> | undefined) => ResultOf<TName>)(nuxtData.data.value)
      : value;

    registerCacheKey(key);
    if (options?.markFresh) {
      markCacheKeyRefreshed(key);
    }
  }

  /**
   * Update a cached query result asynchronously (in-memory + persisted).
   *
   * @param operation Query operation name.
   * @param variables Query variables.
   * @param value New value or updater function that receives current value.
   * @returns Promise that resolves when both in-memory and persisted caches are updated.
   */
  async function update<TName extends QueryName>(
    operation: TName,
    variables: VariablesOf<TName>,
    value: ResultOf<TName> | ((current: ResultOf<TName> | undefined) => ResultOf<TName>),
    options?: CacheWriteOptions,
  ): Promise<void> {
    const { key } = getCacheKeyParts(cacheConfig, operation, variables);
    const nuxtData = useNuxtData<ResultOf<TName>>(key);

    // Get current value from in-memory cache, fallback to persisted
    let current = nuxtData.data.value;
    if (current === undefined && cacheConfig.ttl !== undefined) {
      current = await getPersistedEntry<ResultOf<TName>>(key);
    }

    // Apply value or updater function
    const updated = typeof value === "function"
      ? (value as (current: ResultOf<TName> | undefined) => ResultOf<TName>)(current)
      : value;

    // Update in-memory cache
    nuxtData.data.value = updated;

    // Update persisted cache if enabled
    if (cacheConfig.ttl !== undefined) {
      await setPersistedEntry(key, updated, cacheConfig.ttl);
    }

    registerCacheKey(key);
    if (options?.markFresh) {
      markCacheKeyRefreshed(key);
    }
  }

  /**
   * Invalidate cached query results.
   *
   * @param operation Optional query operation name to invalidate.
   * @param variables Optional query variables for exact match.
   * @returns Promise that resolves when cache entries are invalidated.
   */
  async function invalidate<TName extends QueryName>(
    operation?: TName,
    variables?: VariablesOf<TName>,
  ): Promise<void> {
    // Invalidate everything
    if (operation === undefined) {
      const { keyPrefix, keyVersion } = cacheConfig;
      const prefix = `${keyPrefix}:${keyVersion}:`;
      invalidateAllCacheKeys();
      await deletePersistedByPrefix(prefix);
      await refreshNuxtData();
      return;
    }

    if (variables === undefined) {
      // Invalidate all entries for an operation
      const { opPrefix } = getCacheKeyParts(cacheConfig, operation, {});
      invalidateCachePrefix(opPrefix);
      await deletePersistedByPrefix(opPrefix);
      const keys = getCacheKeysByPrefix(opPrefix);
      if (keys.length > 0) {
        await refreshNuxtData(keys);
      }
      else {
        console.warn(`[nuxt-graphql][cache] No cache keys found for operation "${operation}" with prefix "${opPrefix}"`);
      }
      return;
    }

    // Invalidate a single cache entry (exact)
    const { key } = getCacheKeyParts(cacheConfig, operation, variables);
    invalidateCacheKey(key);
    await deletePersistedEntry(key);
    await refreshNuxtData(key);
  }

  return { cacheConfig, read, write, update, invalidate } as const;
}
