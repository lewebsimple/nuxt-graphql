import { hash } from "ohash";

import type { NuxtApp } from "#app";

import { ttlToExpiresAt } from "./cache-config";
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
// Cache store
// ────────────────────────────────────────────────────────────────────────────

/** Entry stored for a cache key. */
export type CacheMeta<T> = {
  /** In-flight promise for the current cache request. */
  promise?: Promise<T>;
  /** Raw (untransformed) operation result, when one has been resolved. */
  value?: T;
  /** Whether {@link CacheMeta.value} holds a resolved result. */
  hasValue: boolean;
  /** Timestamp when this entry was created. */
  createdAt: number;
  /** Expiration timestamp in milliseconds, or `null` when it does not expire. */
  expiresAt: number | null;
};

/** Cache state for a single Nuxt app instance. */
export type CacheStore = {
  /** Cached entries by cache key. */
  entries: Map<string, CacheMeta<unknown>>;
  /** Invalidation timestamps by cache key prefix. */
  invalidatedPrefixAt: Map<string, number>;
  /** Timestamp of the last global invalidation. */
  invalidatedAllAt: number;
};

/** Property under which the cache store is attached to the Nuxt app. */
type CacheStoreHolder = { _graphqlCache?: CacheStore };

/**
 * Create an empty cache store.
 *
 * @returns A fresh cache store.
 */
export function createCacheStore(): CacheStore {
  return {
    entries: new Map(),
    invalidatedPrefixAt: new Map(),
    invalidatedAllAt: 0,
  };
}

/**
 * Return the cache store bound to a Nuxt app instance, creating it on first use.
 *
 * The store must never live at module scope: on the Nitro server a runtime module is instantiated
 * once per process and would therefore be shared by every concurrent HTTP request, letting one
 * user's in-flight promise (and its data) be handed to another user rendering the same cache key.
 * `nuxtApp` is created per request, so binding the store to it scopes the cache to a single render
 * on the server while remaining a singleton on the client.
 *
 * @param nuxtApp Nuxt app instance owning the cache.
 * @returns The cache store for this Nuxt app.
 */
export function getCacheStore(nuxtApp: NuxtApp): CacheStore {
  const holder = nuxtApp as unknown as CacheStoreHolder;
  return (holder._graphqlCache ??= createCacheStore());
}

// ────────────────────────────────────────────────────────────────────────────
// Invalidation tracking
// ────────────────────────────────────────────────────────────────────────────

/**
 * Invalidate cache entries matching a specific key prefix.
 *
 * @param store Cache store to operate on.
 * @param prefix Cache key prefix to invalidate.
 */
export function invalidateCachePrefix(store: CacheStore, prefix: string): void {
  store.invalidatedPrefixAt.set(prefix, Date.now());
}

/**
 * Invalidate all cache entries regardless of prefix.
 *
 * @param store Cache store to operate on.
 */
export function invalidateAllCache(store: CacheStore): void {
  store.invalidatedAllAt = Date.now();
}

/**
 * Determine whether a cache entry should be bypassed due to invalidation.
 *
 * @param store Cache store to operate on.
 * @param key Full cache key.
 * @param createdAt Entry creation timestamp in milliseconds.
 * @returns `true` when the entry was invalidated by global or prefix invalidation.
 */
export function shouldBypassCache(store: CacheStore, key: string, createdAt?: number): boolean {
  if (!createdAt) return false;
  if (createdAt < store.invalidatedAllAt) return true;

  // Check all prefixes of the key for invalidation timestamps.
  let newest = 0;
  let idx = key.indexOf(":");
  while (idx !== -1) {
    const prefix = key.slice(0, idx + 1);
    const ts = store.invalidatedPrefixAt.get(prefix);

    if (ts && ts > newest) newest = ts;
    idx = key.indexOf(":", idx + 1);
  }

  return createdAt < newest;
}

// ────────────────────────────────────────────────────────────────────────────
// Query cache
// ────────────────────────────────────────────────────────────────────────────

/**
 * Returns the cache entry for a key.
 *
 * @param store Cache store to read from.
 * @param key Cache key used to look up the entry.
 * @returns The entry for the key when present, otherwise `undefined`.
 */
export function getCacheMeta<T>(store: CacheStore, key: string) {
  return store.entries.get(key) as CacheMeta<T> | undefined;
}

/**
 * Read the raw cached value for a key.
 *
 * Values are held here rather than in `nuxtApp.payload.data[key]` because `useAsyncData` owns that
 * slot and overwrites it with the *transformed* result. Reading it back as a raw result would run
 * `transform` a second time over an already-transformed value.
 *
 * @param store Cache store to read from.
 * @param key Cache key to read.
 * @returns The raw cached value, or `undefined` when no value has been resolved.
 */
export function readCachedValue<T>(store: CacheStore, key: string): T | undefined {
  const meta = store.entries.get(key) as CacheMeta<T> | undefined;
  return meta?.hasValue ? meta.value : undefined;
}

/**
 * Resolves a cache entry, storing the raw value along with its timestamps.
 *
 * @param store Cache store to write to.
 * @param key Cache key to resolve.
 * @param value Resolved raw data to store.
 * @param ttl Optional time-to-live in seconds. When omitted, `null`, or `0`, the entry does not expire.
 * @returns The resolved value.
 */
export function resolveCacheEntry<T>(
  store: CacheStore,
  key: string,
  value: T,
  ttl?: number | null,
): T {
  const now = Date.now();

  const meta = store.entries.get(key) as CacheMeta<T> | undefined;
  const next: CacheMeta<T> = meta ?? { createdAt: now, expiresAt: null, hasValue: false };

  next.createdAt = now;
  next.expiresAt = ttlToExpiresAt(ttl, now);
  next.promise = undefined;
  next.value = value;
  next.hasValue = true;

  store.entries.set(key, next);

  return value;
}

/**
 * Seed a cache entry from a previously persisted value, keeping its original timestamps so
 * expiration and invalidation apply to the hydrated entry exactly as they did before persisting.
 *
 * @param store Cache store to write to.
 * @param key Cache key to seed.
 * @param value Raw persisted value.
 * @param createdAt Original creation timestamp in milliseconds.
 * @param expiresAt Original expiration timestamp in milliseconds, or `null` when it does not expire.
 */
export function seedCacheEntry<T>(
  store: CacheStore,
  key: string,
  value: T,
  createdAt: number,
  expiresAt: number | null,
): void {
  const meta = store.entries.get(key) as CacheMeta<T> | undefined;

  // Never clobber fresher state: an in-flight fetch or an already resolved value wins.
  if (meta?.promise || meta?.hasValue) return;

  store.entries.set(key, { createdAt, expiresAt, value, hasValue: true });
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
 * @param store Cache store to operate on.
 * @param key Cache key to resolve.
 * @param create Function to create a new promise if none exists.
 * @param ttl Optional time-to-live in seconds. When omitted, `null`, or `0`, the entry does not expire.
 * @returns A promise for the cache key.
 */
export function getOrCreatePromise<T>(
  store: CacheStore,
  key: string,
  create: () => Promise<T>,
  ttl?: number | null,
): Promise<T> {
  let meta = store.entries.get(key) as CacheMeta<T> | undefined;

  if (meta?.promise) return meta.promise;

  const promise = (async () => {
    const value = await create();
    resolveCacheEntry(store, key, value, ttl);
    return value;
  })();

  if (!meta) {
    meta = { createdAt: Date.now(), expiresAt: null, hasValue: false };
    store.entries.set(key, meta);
  }

  meta.promise = promise;

  // A rejected fetch must not poison the key: drop the in-flight promise so the next call retries
  // instead of receiving the same rejection forever. Any previously cached value is left untouched
  // for the policies that fall back to it.
  promise.catch(() => {
    const current = store.entries.get(key);
    if (current?.promise === promise) current.promise = undefined;
  });

  return promise;
}

/**
 * Determines whether a cache entry should be used based on its presence, invalidation status, and expiration.
 *
 * @param store Cache store to operate on.
 * @param key Cache key to evaluate.
 * @param cached Cached value to check.
 * @param meta Metadata associated with the cache entry.
 * @returns `true` if the cache entry should be used; otherwise `false`.
 */
export function shouldUseCached<T>(
  store: CacheStore,
  key: string,
  cached: T | undefined,
  meta?: CacheMeta<unknown>,
): cached is T {
  if (cached === undefined) return false;
  if (shouldBypassCache(store, key, meta?.createdAt)) return false;
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
