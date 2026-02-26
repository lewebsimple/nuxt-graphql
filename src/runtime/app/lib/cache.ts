import { hash } from "ohash";
import type { CacheConfig } from "../../shared/lib/types";

// Default GraphQL cache configuration
const defaultCacheConfig: CacheConfig = {
  policy: "no-cache",
  ttl: undefined,
  keyPrefix: "gql",
  keyVersion: "1",
};

/**
 * Resolve cache config from default value with user overrides.
 *
 * @param overrides Partial cache config overrides.
 * @returns Resolved cache configuration.
 */
export function resolveCacheConfig(...overrides: Array<Partial<CacheConfig> | undefined>): CacheConfig {
  return Object.assign({}, defaultCacheConfig, ...overrides);
}

type CacheKeyParts = {
  rootPrefix: string;
  scopePrefix: string;
  opPrefix: string;
  key: string;
};

/**
 * Build cache key parts from config, operation name, and variables.
 *
 * @param {GraphQLCacheConfig} config Cache configuration.
 * @param config.keyPrefix Cache key prefix.
 * @param config.keyVersion Cache key version.
 * @param scope Cache scope segment.
 * @param operationName Operation name.
 * @param variables Operation variables.
 * @returns Key parts including full key and operation prefix.
 */
export function getCacheKeyParts(
  { keyPrefix, keyVersion }: CacheConfig,
  scope: string,
  operationName: string,
  variables: unknown,
): CacheKeyParts {
  const rootPrefix = `${keyPrefix}:${keyVersion}:`;
  const scopePrefix = `${rootPrefix}${scope}:`;
  const opPrefix = `${scopePrefix}${operationName}:`;
  const key = `${opPrefix}${hash(variables || {})}`;
  return { rootPrefix, scopePrefix, opPrefix, key };
}

const knownCacheKeys = new Set<string>();

/**
 * Register a cache key seen by async GraphQL queries.
 *
 * @param key Cache key.
 */
export function registerCacheKey(key: string): void {
  knownCacheKeys.add(key);
}

/**
 * Get known cache keys by prefix.
 *
 * @param prefix Cache key prefix.
 * @returns Matching cache keys.
 */
export function getCacheKeysByPrefix(prefix: string): string[] {
  return [...knownCacheKeys].filter((key) => key.startsWith(prefix));
}

// Tracks invalidation state and successful network refresh times per cache key.
const invalidatedExactAt = new Map<string, number>();
const invalidatedPrefixAt = new Map<string, number>();
const refreshedAt = new Map<string, number>();

let invalidatedAllAt = 0;

/**
 * Mark a single cache key as invalidated.
 *
 * @param key Cache key.
 */
export function invalidateCacheKey(key: string): void {
  invalidatedExactAt.set(key, Date.now());
}

/**
 * Mark all cache keys matching a prefix as invalidated.
 *
 * @param prefix Cache key prefix.
 */
export function invalidateCachePrefix(prefix: string): void {
  invalidatedPrefixAt.set(prefix, Date.now());
}

/**
 * Mark all cache keys as invalidated.
 */
export function invalidateAllCacheKeys(): void {
  invalidatedAllAt = Date.now();
}

/**
 * Mark a cache key as refreshed from network.
 *
 * @param key Cache key.
 */
export function markCacheKeyRefreshed(key: string): void {
  refreshedAt.set(key, Date.now());
}

/**
 * Determine whether cache should be bypassed for this key.
 *
 * @param key Cache key.
 * @returns True when invalidation is newer than the last successful network refresh.
 */
export function shouldBypassCache(key: string): boolean {
  const lastRefreshAt = refreshedAt.get(key) ?? 0;
  const exactInvalidatedAt = invalidatedExactAt.get(key) ?? 0;

  let prefixInvalidatedAt = 0;
  for (const [prefix, timestamp] of invalidatedPrefixAt) {
    if (key.startsWith(prefix) && timestamp > prefixInvalidatedAt) {
      prefixInvalidatedAt = timestamp;
    }
  }

  const latestInvalidationAt = Math.max(invalidatedAllAt, exactInvalidatedAt, prefixInvalidatedAt);
  return latestInvalidationAt > lastRefreshAt;
}
