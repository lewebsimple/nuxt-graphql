import { createStorage } from "unstorage";
import memoryDriver from "unstorage/drivers/memory";
import localStorageDriver from "unstorage/drivers/localstorage";
import { hash } from "ohash";

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

const inFlight = new Map<string, Promise<unknown>>();
const refreshCallbacks = new Map<string, Set<() => void>>();

let storage: ReturnType<typeof createStorage> | null = null;

export function initCache(type: "memory" | "localStorage") {
  if (storage) return;
  storage = createStorage({
    driver: type === "localStorage" ? localStorageDriver({ base: "graphql:" }) : memoryDriver(),
  });
}

export function getCacheKey(operationName: string, variables: unknown): string {
  return `${operationName}:${hash(variables ?? {})}`;
}

export async function cacheGet<T>(operationName: string, variables: unknown): Promise<T | null> {
  if (!storage) return null;
  const key = getCacheKey(operationName, variables);
  const entry = await storage.getItem<CacheEntry<T>>(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    await storage.removeItem(key);
    return null;
  }
  return entry.data;
}

export async function cacheSet<T>(operationName: string, variables: unknown, data: T, ttl: number): Promise<void> {
  if (!storage) return;
  const key = getCacheKey(operationName, variables);
  const entry: CacheEntry<T> = { data, expires: Date.now() + ttl };
  await storage.setItem(key, entry);
}

export function dedupeGet(operationName: string, variables: unknown): Promise<unknown> | null {
  const key = getCacheKey(operationName, variables);
  return inFlight.get(key) ?? null;
}

export function dedupeSet(operationName: string, variables: unknown, promise: Promise<unknown>): void {
  const key = getCacheKey(operationName, variables);
  inFlight.set(key, promise);
  promise.finally(() => inFlight.delete(key));
}

/**
 * Register a refresh callback for a query
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
 * Invalidate cached queries and trigger refreshes
 * - No args: invalidate all
 * - operationName only: invalidate all queries with that name
 * - operationName + variables: invalidate specific query
 */
export async function cacheInvalidate(operationName?: string, variables?: unknown): Promise<void> {
  if (!storage) return;

  if (operationName && variables !== undefined) {
    // Specific query
    const key = getCacheKey(operationName, variables);
    await storage.removeItem(key);
    refreshCallbacks.get(key)?.forEach((cb) => cb());
  }
  else {
    // All or by operation name
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
