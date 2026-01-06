import { useRuntimeConfig } from "#imports";
import { cacheInvalidate, initCache } from "../utils/graphql-cache";
import type { QueryName, QueryVariables } from "#graphql/registry";

/**
 * GraphQL cache management composable
 *
 * @returns Object with enabled flag and invalidate function
 */
export function useGraphQLCache() {
  const { public: { graphql: { cache: cacheConfig } } } = useRuntimeConfig();

  // Initialize cache on first use (client-side only)
  if (import.meta.client && cacheConfig.enabled) {
    initCache(cacheConfig.storage);
  }

  /**
   * Invalidate cached queries and refresh active instances
   *
   * @param operationName Optional operation name to filter invalidation
   * @param variables Optional variables to target specific query
   *
   * Usage:
   * - No args: invalidate all queries
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
