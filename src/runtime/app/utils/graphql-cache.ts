import { createStorage } from "unstorage";
import memoryDriver from "unstorage/drivers/memory";
import localStorageDriver from "unstorage/drivers/localstorage";
import { hash } from "ohash";

// Cache configuration
export interface GraphQLCacheConfig {
  enabled: boolean;
  ttl: number;
  storage: "memory" | "localStorage";
}

export interface CacheOptions {
  enabled?: boolean;
  ttl?: number;
}

interface CacheEntry<T> {
  data: T;
  expires: number;
}

// In-flight request deduplication
const inFlight = new Map<string, Promise<unknown>>();

// Refresh callbacks for cache invalidation
const refreshCallbacks = new Map<string, Set<() => void>>();

// Storage instance
let storage: ReturnType<typeof createStorage> | null = null;

// Initialize cache storage
export function initCache(type: "memory" | "localStorage") {
  if (storage) return;

  storage = createStorage({
    driver: type === "localStorage" ? localStorageDriver({ base: "graphql:" }) : memoryDriver(),
  });
}

// Generate a cache key from operation name and variables
export function getCacheKey(operationName: string, variables: unknown): string {
  return `${operationName}:${hash(variables ?? {})}`;
}

// Retrieve cached data for a query
export async function cacheGet<T>(operationName: string, variables: unknown): Promise<T | null> {
  if (!storage) return null;

  const key = getCacheKey(operationName, variables);
  const entry = await storage.getItem<CacheEntry<T>>(key);

  if (!entry) return null;

  // Check if cache entry has expired
  if (Date.now() > entry.expires) {
    await storage.removeItem(key);
    return null;
  }

  return entry.data;
}

// Store data in cache with TTL
export async function cacheSet<T>(operationName: string, variables: unknown, data: T, ttl: number): Promise<void> {
  if (!storage) return;

  const key = getCacheKey(operationName, variables);
  const entry: CacheEntry<T> = { data, expires: Date.now() + ttl };

  await storage.setItem(key, entry);
}

// Get in-flight request for deduplication
export function dedupeGet(operationName: string, variables: unknown): Promise<unknown> | null {
  const key = getCacheKey(operationName, variables);
  return inFlight.get(key) ?? null;
}

// Register in-flight request for deduplication
export function dedupeSet(operationName: string, variables: unknown, promise: Promise<unknown>): void {
  const key = getCacheKey(operationName, variables);
  inFlight.set(key, promise);
  promise.finally(() => inFlight.delete(key));
}

/**
 * Register a refresh callback for a query
 *
 * @param operationName GraphQL operation name
 * @param variables Query variables
 * @param refresh Callback to execute on cache invalidation
 * @returns Unregister function
 */
export function registerRefresh(operationName: string, variables: unknown, refresh: () => void): () => void {
  const key = getCacheKey(operationName, variables);

  if (!refreshCallbacks.has(key)) {
    refreshCallbacks.set(key, new Set());
  }

  refreshCallbacks.get(key)!.add(refresh);

  return () => refreshCallbacks.get(key)?.delete(refresh);
}

/**
 * Invalidate cached queries and trigger refresh callbacks
 *
 * @param operationName Optional operation name to filter invalidation
 * @param variables Optional variables to target specific query
 *
 * Usage:
 * - No args: invalidate all queries
 * - operationName only: invalidate all queries with that name
 * - operationName + variables: invalidate specific query
 */
export async function cacheInvalidate(operationName?: string, variables?: unknown): Promise<void> {
  if (!storage) return;

  if (operationName && variables !== undefined) {
    // Invalidate specific query
    const key = getCacheKey(operationName, variables);
    await storage.removeItem(key);
    refreshCallbacks.get(key)?.forEach((cb) => cb());
  }
  else {
    // Invalidate all queries or by operation name
    const keys = await storage.getKeys();
    const toRemove = operationName
      ? keys.filter((k) => k.startsWith(`${operationName}:`))
      : keys;

    await Promise.all(toRemove.map((k) => storage!.removeItem(k)));

    for (const key of toRemove) {
      refreshCallbacks.get(key)?.forEach((cb) => cb());
    }
  }
}
