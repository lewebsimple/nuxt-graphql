// ────────────────────────────────────────────────────────────────────────────
// GraphQL cache configuration helpers
// ────────────────────────────────────────────────────────────────────────────

/** Cache configuration. */
export type CacheConfig = {
  /** Cache strategy. */
  policy: "no-cache" | "cache-first" | "network-first" | "swr";
  /** Optional cache time-to-live in seconds. */
  ttl?: number;
  /** Cache key prefix. */
  keyPrefix: string;
  /** Cache key version. */
  keyVersion: string | number;
};

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  policy: "no-cache",
  ttl: undefined,
  keyPrefix: "gql",
  keyVersion: "1",
};

/**
 * Merge cache configuration overrides with defaults.
 *
 * @param overrides Partial cache config overrides.
 * @returns Resolved cache configuration.
 */
export function resolveCacheConfig(
  ...overrides: Array<Partial<CacheConfig> | undefined>
): CacheConfig {
  return Object.assign({}, DEFAULT_CACHE_CONFIG, ...overrides);
}
