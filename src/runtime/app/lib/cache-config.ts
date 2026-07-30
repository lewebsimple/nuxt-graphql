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

/**
 * Convert a cache TTL into an absolute expiration timestamp.
 *
 * @param ttl Time-to-live in seconds; `0`, `null`, and `undefined` produce an entry that never expires.
 * @param now Current timestamp in milliseconds.
 * @returns Expiration timestamp in milliseconds, or `null` when the entry never expires.
 */
export function ttlToExpiresAt(ttl: number | null | undefined, now: number): number | null {
  return ttl ? now + ttl * 1000 : null;
}
