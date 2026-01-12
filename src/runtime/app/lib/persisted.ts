import { createStorage } from "unstorage";
import localStorageDriver from "unstorage/drivers/localstorage";

type PersistedPayload<T> = {
  value: T;
  expiresAt: number | null;
};

// Check if persisted storage (localStorage) is available
function isPersistedStorageAvailable(): boolean {
  return import.meta.client && typeof window.localStorage !== "undefined";
}

// Lazy initialization of persisted storage
let storage: ReturnType<typeof createStorage> | null = null;
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

// Get persisted entry by key
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

// Set persisted entry with key, value and TTL in seconds
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

// Delete persisted entry by key
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

// Delete persisted entries by prefix
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
