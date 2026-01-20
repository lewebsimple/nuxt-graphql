import { createStorage } from "unstorage";
import localStorageDriver from "unstorage/drivers/localstorage";

type PersistedPayload<T> = {
  value: T;
  expiresAt: number | null;
};

/**
 * Determine whether localStorage-backed persistence is available.
 *
 * @returns True when localStorage is available on the client.
 */
function isPersistedStorageAvailable(): boolean {
  return import.meta.client && typeof window.localStorage !== "undefined";
}

let storage: ReturnType<typeof createStorage> | null = null;
/**
 * Lazily create the persisted storage instance.
 *
 * @returns Storage instance or null when unavailable.
 */
function getPersistedStorage(): ReturnType<typeof createStorage> | null {
  if (!storage && isPersistedStorageAvailable()) {
    try {
      storage = createStorage({
        driver: localStorageDriver({ base: "nuxt-graphql:" }),
      });
    }
    catch {
      storage = null;
    }
  }
  return storage;
}

/**
 * Retrieve a persisted cache entry.
 *
 * @param key Cache key.
 * @returns Cached value or undefined when missing/expired.
 */
export async function getPersistedEntry<T>(key: string): Promise<T | undefined> {
  const ps = getPersistedStorage();
  if (!ps) {
    return undefined;
  }
  try {
    const payload = await ps.getItem<PersistedPayload<T>>(key);
    if (!payload) {
      return undefined;
    }
    if (payload.expiresAt && payload.expiresAt < Date.now()) {
      await ps.removeItem(key);
      return undefined;
    }
    return payload.value;
  }
  catch {
    return undefined;
  }
}

/**
 * Persist a cache entry with TTL.
 *
 * @param key Cache key.
 * @param value Value to store.
 * @param ttl Time to live in seconds (0 = never expires).
 * @returns Resolves when the entry is stored.
 */
export async function setPersistedEntry<T>(key: string, value: T, ttl: number): Promise<void> {
  const ps = getPersistedStorage();
  if (!ps) {
    return;
  }
  const expiresAt = ttl > 0 ? Date.now() + ttl * 1000 : null;
  try {
    const payload: PersistedPayload<T> = { value, expiresAt };
    await ps.setItem(key, payload);
  }
  catch {
    // Ignore errors
  }
}

/**
 * Delete a persisted cache entry by key.
 *
 * @param key Cache key.
 * @returns Resolves when the entry is removed.
 */
export async function deletePersistedEntry(key: string): Promise<void> {
  const ps = getPersistedStorage();
  if (!ps) {
    return;
  }
  try {
    await ps.removeItem(key);
  }
  catch {
    // Ignore errors
  }
}

/**
 * Delete all persisted cache entries by key prefix.
 *
 * @param prefix Cache key prefix.
 * @returns Resolves when matching entries are removed.
 */
export async function deletePersistedByPrefix(prefix: string): Promise<void> {
  const ps = getPersistedStorage();
  if (!ps) {
    return;
  }
  try {
    const keys = await ps.getKeys(prefix);
    await Promise.all(keys.map((key) => ps.removeItem(key)));
  }
  catch {
    // Ignore errors
  }
}
