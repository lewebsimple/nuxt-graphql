import { hash } from "ohash";

// ────────────────────────────────────────────────────────────────────────────────
// Cached loader
// ────────────────────────────────────────────────────────────────────────────────

type BuildCache<TData> = { key: string; data: TData };
const buildCache = new Map<string, BuildCache<unknown>>();

/**
 * Gets a cached version of the loader function.
 *
 * @param {string} baseKey Base key to identify the loader
 * @param {(...args: TArgs) => Promise<TData>} loader The loader function to be cached
 * @returns {(...args: TArgs) => Promise<TData>} A function that returns cached data if available, otherwise calls the loader
 */
export function getCachedLoader<TData, TArgs extends unknown[] = []>(
  baseKey: string,
  loader: (...args: TArgs) => Promise<TData>,
) {
  return async (...args: TArgs): Promise<TData> => {
    const key = `${baseKey}:${hash(args)}`;
    const cached = buildCache.get(key);
    if (cached?.key === key) {
      return cached.data as TData;
    }
    const data = await loader(...args);
    buildCache.set(key, { key, data });
    return data;
  };
}

/**
 * Clears the build cache entirely or for specific base keys.
 * @param {string | string[]} [baseKey] Optional base key or array of base keys to clear from the cache
 */
export function clearBuildCache(baseKey?: string | string[]) {
  if (!baseKey) {
    buildCache.clear();
  }
  const baseKeys = Array.isArray(baseKey) ? baseKey : [baseKey];
  for (const key of buildCache.keys()) {
    for (const baseKey of baseKeys) {
      if (key.startsWith(`${baseKey}:`)) {
        buildCache.delete(key);
      }
    }
  }
}
