import { clearNuxtData, useRuntimeConfig } from "#imports";
import { getCacheKeyParts } from "../lib/graphql-cache";
import { deletePersistedByPrefix, deletePersistedEntry } from "../lib/persisted";

export type InvalidateCacheLayer = "both" | "memory" | "persisted";

export interface InvalidateCacheOptions {
  layer?: InvalidateCacheLayer;
}

export function useGraphQLCache() {
  const { public: { graphql: { cacheConfig } } } = useRuntimeConfig();

  async function invalidateByKey(operationName: string, variables: unknown, options?: InvalidateCacheOptions) {
    const cacheLayer = options?.layer ?? "both";
    const { key } = getCacheKeyParts(cacheConfig, operationName, variables);
    if (cacheLayer === "both" || cacheLayer === "memory") {
      clearNuxtData(key);
    }
    if (cacheLayer === "both" || cacheLayer === "persisted") {
      await deletePersistedEntry(key);
    }
  }

  async function invalidateByOperation(operationName: string, options?: InvalidateCacheOptions) {
    const cacheLayer = options?.layer ?? "both";
    const { opPrefix } = getCacheKeyParts(cacheConfig, operationName, {});
    if (cacheLayer === "both" || cacheLayer === "memory") {
      clearNuxtData((k) => k.startsWith(opPrefix));
    }
    if (cacheLayer === "both" || cacheLayer === "persisted") {
      await deletePersistedByPrefix(opPrefix);
    }
  }

  async function invalidateAll(options?: InvalidateCacheOptions) {
    const cacheLayer = options?.layer ?? "both";
    if (cacheLayer === "both" || cacheLayer === "memory") {
      clearNuxtData((k) => k.startsWith(`${cacheConfig.keyPrefix}:${cacheConfig.cacheVersion}:`));
    }
    if (cacheLayer === "both" || cacheLayer === "persisted") {
      await deletePersistedByPrefix(`${cacheConfig.keyPrefix}:${cacheConfig.cacheVersion}:`);
    }
  }

  return {
    cacheConfig,
    invalidateByKey,
    invalidateByOperation,
    invalidateAll,
  } as const;
}
