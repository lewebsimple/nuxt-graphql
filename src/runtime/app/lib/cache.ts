import { hash } from "ohash";

import type { CacheConfig } from "./cache-config";

// ────────────────────────────────────────────────────────────────────────────
// Cache key helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Build the root cache key prefix shared by all entries.
 *
 * @param config Cache configuration.
 * @returns Root cache prefix.
 */
export function getCacheRootPrefix({ keyPrefix, keyVersion }: CacheConfig): string {
  return `${keyPrefix}:${keyVersion}:`;
}

/**
 * Build the cache key prefix for a specific scope.
 *
 * @param config Cache configuration.
 * @param scope Cache scope.
 * @returns Scope cache prefix.
 */
export function getCacheScopePrefix(config: CacheConfig, scope: string): string {
  return `${getCacheRootPrefix(config)}${scope}:`;
}

/**
 * Build the cache key prefix for a specific operation in a scope.
 *
 * @param config Cache configuration.
 * @param scope Cache scope.
 * @param operationName GraphQL operation name.
 * @returns Operation cache prefix.
 */
export function getCacheOperationPrefix(
  config: CacheConfig,
  scope: string,
  operationName: string,
): string {
  return `${getCacheScopePrefix(config, scope)}${operationName}:`;
}

/**
 * Build the full cache key for a scoped operation and variables.
 *
 * @param config Cache configuration.
 * @param scope Cache scope.
 * @param operationName GraphQL operation name.
 * @param variables Operation variables.
 * @returns Full cache key.
 */
export function getCacheKey(
  config: CacheConfig,
  scope: string,
  operationName: string,
  variables: unknown,
): string {
  return `${getCacheOperationPrefix(config, scope, operationName)}${hash(variables ?? {})}`;
}

// ────────────────────────────────────────────────────────────────────────────
// Invalidation tracking
// ────────────────────────────────────────────────────────────────────────────

// In-memory tracking of cache invalidation timestamps for prefixes and global scope.
const invalidatedPrefixAt = new Map<string, number>();
let invalidatedAllAt = 0;

/**
 * Invalidate cache entries matching a specific key prefix.
 *
 * @param prefix Cache key prefix to invalidate.
 */
export function invalidateCachePrefix(prefix: string): void {
  invalidatedPrefixAt.set(prefix, Date.now());
}

/** Invalidate all cache entries regardless of prefix. */
export function invalidateAllCache(): void {
  invalidatedAllAt = Date.now();
}

/**
 * Determine whether a cache entry should be bypassed due to invalidation.
 *
 * @param key Full cache key.
 * @param createdAt Entry creation timestamp in milliseconds.
 * @returns `true` when the entry was invalidated by global or prefix invalidation.
 */
export function shouldBypassCache(key: string, createdAt?: number): boolean {
  if (!createdAt) return false;
  if (createdAt < invalidatedAllAt) return true;

  // Check all prefixes of the key for invalidation timestamps.
  let newest = 0;
  let idx = key.indexOf(":");
  while (idx !== -1) {
    const prefix = key.slice(0, idx + 1);
    const ts = invalidatedPrefixAt.get(prefix);

    if (ts && ts > newest) newest = ts;
    idx = key.indexOf(":", idx + 1);
  }

  return createdAt < newest;
}

// ────────────────────────────────────────────────────────────────────────────
// Query cache using Nuxt data and in-memory metadata map
// ────────────────────────────────────────────────────────────────────────────

/** Metadata stored for a cache entry. */
export type CacheMeta<T> = {
  /** In-flight promise for the current cache request. */
  promise?: Promise<T>;
  /** Timestamp when this metadata entry was created. */
  createdAt: number;
  /** Expiration timestamp in milliseconds, or `null` when it does not expire. */
  expiresAt: number | null;
};

const metaCache = new Map<string, CacheMeta<unknown>>();

/**
 * Returns metadata for a cache key.
 *
 * @param key Cache key used to look up metadata.
 * @returns Metadata for the key when present, otherwise `undefined`.
 */
export function getCacheMeta<T>(key: string) {
  return metaCache.get(key) as CacheMeta<T> | undefined;
}

/**
 * Resolves a cache entry and updates both metadata and Nuxt data state.
 *
 * @param key Cache key to resolve.
 * @param value Resolved data to store in Nuxt state.
 * @param ttl Optional time-to-live in milliseconds. When omitted or `null`, the entry does not expire.
 * @returns The resolved value.
 */
export function resolveCacheEntry<T>(key: string, value: T, ttl?: number | null): T {
  const now = Date.now();

  const meta = metaCache.get(key) as CacheMeta<T> | undefined;
  const next: CacheMeta<T> = meta ?? { createdAt: now, expiresAt: null };

  next.createdAt = now;
  next.expiresAt = ttl ? now + ttl : null;
  next.promise = undefined;

  metaCache.set(key, next);

  return value;
}

/**
 * Returns whether the provided cache metadata is expired.
 *
 * @param meta Metadata object to evaluate.
 * @returns `true` when metadata exists and is past its expiration time; otherwise `false`.
 */
export function isExpired(meta?: CacheMeta<unknown>) {
  if (!meta) return false;
  if (meta.expiresAt === null) return false;
  return Date.now() > meta.expiresAt;
}

/**
 * Returns a promise for a cache key, creating it if it doesn't exist.
 *
 * @param key Cache key to resolve.
 * @param create Function to create a new promise if none exists.
 * @param ttl Optional time-to-live in milliseconds. When omitted or `null`, the entry does not expire.
 * @returns A promise for the cache key.
 */
export function getOrCreatePromise<T>(
  key: string,
  create: () => Promise<T>,
  ttl?: number | null,
): Promise<T> {
  let meta = metaCache.get(key) as CacheMeta<T> | undefined;

  if (meta?.promise) return meta.promise;

  const promise = (async () => {
    const value = await create();
    resolveCacheEntry(key, value, ttl);
    return value;
  })();

  if (!meta) {
    meta = { createdAt: Date.now(), expiresAt: null };
    metaCache.set(key, meta);
  }

  meta.promise = promise;
  return promise;
}

/**
 * Determines whether a cache entry should be used based on its presence, invalidation status, and expiration.
 *
 * @param key Cache key to evaluate.
 * @param cached Cached value to check.
 * @param meta Metadata associated with the cache entry.
 * @returns `true` if the cache entry should be used; otherwise `false`.
 */
export function shouldUseCached<T>(
  key: string,
  cached: T | undefined,
  meta?: CacheMeta<unknown>,
): cached is T {
  if (cached === undefined) return false;
  if (shouldBypassCache(key, meta?.createdAt)) return false;
  if (isExpired(meta)) return false;
  return true;
}

// ────────────────────────────────────────────────────────────────────────────
// Stale-while-revalidate policy
// ────────────────────────────────────────────────────────────────────────────

type SWRParams<T> = {
  cached: T | undefined;
  fetch: () => Promise<T>;
  inFlight?: Promise<T>;
};

/**
 * Return cached data immediately and refresh in background when possible.
 *
 * @param params SWR inputs including cached value, fetcher, and optional in-flight promise.
 * @returns Cached value when available, otherwise a promise resolving fresh data.
 */
export function staleWhileRevalidate<T>({ cached, fetch, inFlight }: SWRParams<T>): Promise<T> | T {
  if (cached !== undefined) {
    if (!inFlight) {
      fetch().catch(() => {});
    }
    return cached;
  }
  return inFlight ?? fetch();
}
