import type { QueryName } from "#graphql/registry";
import { clearNuxtData, useRuntimeConfig } from "#imports";
import { getCacheKeyParts, type CacheConfig } from "../lib/cache";
import { deletePersistedByPrefix, deletePersistedEntry } from "../lib/persisted";

/**
 * GraphQL cache helper composable.
 *
 * @returns Cache config and invalidation helper.
 */
export function useGraphQLCache() {
  const { public: { graphql: { cacheConfig } } } = useRuntimeConfig();

  // Invalidate cached query results.
  async function invalidate(options?: { operation: QueryName; variables?: unknown }) {
    // Invalidate everything
    if (!options) {
      const { keyPrefix, keyVersion } = cacheConfig;
      const prefix = `${keyPrefix}:${keyVersion}:`;
      clearNuxtData((k) => k.startsWith(prefix));
      await deletePersistedByPrefix(prefix);
      return;
    }

    const { operation, variables } = options;

    if (variables === undefined) {
      // Invalidate all entries for an operation
      const { opPrefix } = getCacheKeyParts(cacheConfig, operation, {});
      clearNuxtData((k) => k.startsWith(opPrefix));
      await deletePersistedByPrefix(opPrefix);
      return;
    }

    // Invalidate a single cache entry (exact)
    const { key } = getCacheKeyParts(cacheConfig, operation, variables);
    clearNuxtData(key);
    await deletePersistedEntry(key);
  }

  return { cacheConfig, invalidate } as const;
}

declare module "nuxt/schema" {
  interface PublicRuntimeConfig {
    graphql: {
      cacheConfig: CacheConfig;
    };
  }
}
