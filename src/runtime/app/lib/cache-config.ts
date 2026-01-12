export type CachePolicy = "no-cache" | "cache-first" | "network-first" | "swr";

export interface CacheConfig {
  // Cache policy for queries (can be overridden per-query)
  cachePolicy: CachePolicy;
  // Cache version / prefix to safely invalidate persisted entries across deploys
  cacheVersion: string;
  keyPrefix: string;
  // Persist cache entries in localStorage with TTL in seconds (0 = never expires, undefined = disabled)
  ttl?: number;
}

// Default GraphQL cache configuration
const defaultCacheConfig: CacheConfig = {
  cachePolicy: "cache-first",
  cacheVersion: "1",
  keyPrefix: "gql",
  ttl: 60,
};

// Resolve GraphQL cache configuration by merging multiple partial configs
export function resolveCacheConfig(...overrides: Array<Partial<CacheConfig> | undefined>): CacheConfig {
  return Object.assign({}, defaultCacheConfig, ...overrides);
}
