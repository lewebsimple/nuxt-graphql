import { ttlToExpiresAt } from "./cache-config";

type PersistedEntry<T> = {
  value: T;
  createdAt: number;
  expiresAt: number | null;
};

function getStorage(): Storage | null {
  if (import.meta.server) {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function buildKey(key: string) {
  return `cache:${key}`;
}

/**
 * Read a persisted cache entry from local storage.
 *
 * @param key Cache key.
 * @returns Persisted entry when present and not expired.
 */
export async function getPersistedEntry<T>(key: string): Promise<PersistedEntry<T> | undefined> {
  const storage = getStorage();
  if (!storage) return undefined;

  try {
    const storageKey = buildKey(key);
    const raw = storage.getItem(storageKey);
    if (!raw) return undefined;

    const entry = JSON.parse(raw) as PersistedEntry<T>;

    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      storage.removeItem(storageKey);
      return undefined;
    }

    return entry;
  } catch {
    return undefined;
  }
}

/**
 * Persist a cache entry to local storage.
 *
 * @param key Cache key.
 * @param value Value to persist.
 * @param ttl Optional time-to-live in seconds; `0` never expires.
 * @returns Nothing.
 */
export async function setPersistedEntry<T>(key: string, value: T, ttl?: number | null) {
  const storage = getStorage();
  if (!storage) return;

  try {
    const now = Date.now();

    const entry: PersistedEntry<T> = {
      value,
      createdAt: now,
      expiresAt: ttlToExpiresAt(ttl, now),
    };

    storage.setItem(buildKey(key), JSON.stringify(entry));
  } catch {
    // Ignore quota / serialization errors
  }
}

/**
 * Remove a single persisted cache entry.
 *
 * @param key Cache key.
 * @returns Nothing.
 */
export async function deletePersistedEntry(key: string) {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(buildKey(key));
  } catch {
    // Ignore errors
  }
}

/**
 * Remove persisted entries left behind by other cache key versions.
 *
 * Expiration only deletes an entry when it is *read*, and a bumped `keyVersion` means old keys
 * are never read again: without this sweep every release leaves its whole cache orphaned in
 * `localStorage` forever. Runs once at client startup (see the graphql plugin).
 *
 * @param keyPrefix The configured cache key prefix (e.g. `gql`).
 * @param rootPrefix The current version's root prefix (e.g. `gql:1.2.3:`).
 * @returns Nothing.
 */
export async function purgePersistedOtherVersions(keyPrefix: string, rootPrefix: string) {
  const storage = getStorage();
  if (!storage) return;

  try {
    const family = buildKey(`${keyPrefix}:`);
    const current = buildKey(rootPrefix);

    for (let i = storage.length - 1; i >= 0; i--) {
      const k = storage.key(i);
      if (!k) continue;

      if (k.startsWith(family) && !k.startsWith(current)) {
        storage.removeItem(k);
      }
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Remove persisted cache entries matching a key prefix.
 *
 * @param prefix Cache key prefix.
 * @returns Nothing.
 */
export async function deletePersistedByPrefix(prefix: string) {
  const storage = getStorage();
  if (!storage) return;

  try {
    const fullPrefix = buildKey(prefix);

    for (let i = storage.length - 1; i >= 0; i--) {
      const k = storage.key(i);
      if (!k) continue;

      if (k.startsWith(fullPrefix)) {
        storage.removeItem(k);
      }
    }
  } catch {
    // Ignore errors
  }
}
