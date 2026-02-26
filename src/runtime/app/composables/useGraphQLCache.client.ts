import type { QueryName, ResultOf, VariablesOf } from "#graphql/registry";
import { refreshNuxtData, useNuxtData, useRuntimeConfig } from "#imports";
import type { IsEmptyObject } from "../../shared/lib/types";
import { getCacheKeyParts, getCacheKeysByPrefix, invalidateAllCacheKeys, invalidateCacheKey, invalidateCachePrefix, markCacheKeyRefreshed, registerCacheKey } from "../lib/cache";
import { deletePersistedByPrefix, deletePersistedEntry, getPersistedEntry, setPersistedEntry } from "../lib/persisted";

type CacheWriteOptions = { markFresh?: boolean };

/**
 * GraphQL cache helper composable.
 *
 * @returns Cache manipulation helpers.
 */
export function useGraphQLCache(scope: string = "global") {
  const { public: { graphql: { cacheConfig } } } = useRuntimeConfig();

  // Local cache key resolver to avoid repeating cacheConfig and scope parameters
  function resolveKeyParts<TName extends QueryName>(operation: TName, variables: VariablesOf<TName> | undefined) {
    return getCacheKeyParts(cacheConfig, scope, operation, variables ?? {});
  }

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
    const { key } = resolveKeyParts(operation, variables);
    const nuxtData = useNuxtData<ResultOf<TName>>(key);
    return nuxtData.data.value;
  }

  // Apply a cache write synchronously and register the key
  function applyWrite<TName extends QueryName>(
    key: string,
    value: ResultOf<TName> | ((current: ResultOf<TName> | undefined) => ResultOf<TName>),
    current: ResultOf<TName> | undefined,
    options?: CacheWriteOptions,
  ): ResultOf<TName> {
    const nuxtData = useNuxtData<ResultOf<TName>>(key);
    const next = typeof value === "function"
      ? (value as (c: ResultOf<TName> | undefined) => ResultOf<TName>)(current)
      : value;
    nuxtData.data.value = next;
    registerCacheKey(key);
    if (options?.markFresh) {
      markCacheKeyRefreshed(key);
    }
    return next;
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
    const { key } = resolveKeyParts(operation, variables);
    const nuxtData = useNuxtData<ResultOf<TName>>(key);
    applyWrite<TName>(key, value, nuxtData.data.value, options);
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
    const { key } = resolveKeyParts(operation, variables);
    const nuxtData = useNuxtData<ResultOf<TName>>(key);
    let current = nuxtData.data.value;
    if (current === undefined && cacheConfig.ttl !== undefined) {
      current = await getPersistedEntry<ResultOf<TName>>(key);
    }
    const next = applyWrite<TName>(key, value, current, options);
    if (cacheConfig.ttl !== undefined) {
      await setPersistedEntry(key, next, cacheConfig.ttl);
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
    const { scopePrefix, opPrefix, key } = resolveKeyParts(operation as TName, variables);

    // Invalidate entire scope
    if (operation === undefined) {
      invalidateCachePrefix(scopePrefix);
      await deletePersistedByPrefix(scopePrefix);
      const keys = getCacheKeysByPrefix(scopePrefix);
      if (keys.length > 0) {
        await refreshNuxtData(keys);
      }
      return;
    }

    // Invalidate operation within scope
    if (variables === undefined) {
      invalidateCachePrefix(opPrefix);
      await deletePersistedByPrefix(opPrefix);
      const keys = getCacheKeysByPrefix(opPrefix);
      if (keys.length > 0) {
        await refreshNuxtData(keys);
      }
      return;
    }

    // Invalidate exact key within scope
    invalidateCacheKey(key);
    await deletePersistedEntry(key);
    await refreshNuxtData(key);
  }

  /**
   * Invalidate all cache entries across all scopes.
   *
   * @returns Promise that resolves when all cache entries are invalidated.
   */
  async function invalidateAllScopes(): Promise<void> {
    const { keyPrefix, keyVersion } = cacheConfig;
    const rootPrefix = `${keyPrefix}:${keyVersion}:`;
    invalidateAllCacheKeys();
    await deletePersistedByPrefix(rootPrefix);
    await refreshNuxtData();
  }

  return { cacheConfig, read, write, update, invalidate, invalidateAllScopes } as const;
}
