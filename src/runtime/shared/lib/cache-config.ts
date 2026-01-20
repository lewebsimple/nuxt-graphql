type GraphQLCachePolicy = "no-cache" | "cache-first" | "network-first" | "swr";

export type CacheConfig = {
  /**
   * Prefix used for all persisted cache keys.
   *
   * Used for namespacing and bulk invalidation.
   * Default: 'graphql'
   */
  keyPrefix: string;

  /**
   * Version included in cache keys.
   *
   * Changing this value invalidates all existing cache entries.
   * Default: '1'
   */
  keyVersion: string | number;

  /**
   * Cache strategy used by useAsyncGraphQLQuery.
   *
   * - 'no-cache'        → always fetch, never read/write cache
   * - 'cache-first'     → return cache if valid, otherwise fetch
   * - 'network-first'   → fetch first, fallback to cache on failure
   * - 'swr'             → return cache immediately, revalidate in background
   */
  policy: GraphQLCachePolicy;

  /**
   * Time-to-live in seconds.
   *
   * - undefined → inherit from higher-level config
   * - 0         → never expires
   * - > 0       → expires after TTL
   */
  ttl?: number;
};

// Default GraphQL cache configuration
const defaultCacheConfig: CacheConfig = {
  keyPrefix: "gql",
  keyVersion: "1",
  policy: "no-cache",
  ttl: undefined,
};

/**
 * Merge the default cache config with user overrides.
 *
 * @param overrides Partial cache config overrides.
 * @returns Resolved cache configuration.
 */
export function resolveCacheConfig(...overrides: Array<Partial<CacheConfig> | undefined>): CacheConfig {
  return Object.assign({}, defaultCacheConfig, ...overrides);
}
