import { useRuntimeConfig } from "#imports";
import { cacheInvalidate, initCache } from "../utils/graphql-cache";
import type { QueryName, QueryVariables } from "#graphql/registry";

export function useGraphQLCache() {
  const { public: { graphql: { cache: cacheConfig } } } = useRuntimeConfig();

  // Initialize cache on first use (client-side only)
  if (import.meta.client && cacheConfig.enabled) {
    initCache(cacheConfig.storage);
  }

  /**
   * Invalidate cached queries and refresh active instances
   * - No args: invalidate all
   * - operationName only: invalidate all queries with that name
   * - operationName + variables: invalidate specific query
   */
  async function invalidate<N extends QueryName>(
    operationName?: N,
    variables?: QueryVariables<N>,
  ): Promise<void> {
    await cacheInvalidate(operationName, variables);
  }

  return {
    enabled: cacheConfig.enabled,
    invalidate,
  };
}
