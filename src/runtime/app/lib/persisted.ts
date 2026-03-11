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
 * @param ttl Optional time-to-live in milliseconds.
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
      expiresAt: ttl ? now + ttl : null,
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
