import { hash } from "ohash";

/** In-memory cache for async loader results, keyed by stable hashes of input arguments. */
type BuildCacheEntry<TData> = {
  /** Stable key computed from input arguments. */
  key: string;
  /** Cached loader result. */
  data: TData;
};
const buildCache = new Map<string, BuildCacheEntry<unknown>>();

/**
 * Wrap an async loader with an argument-based in-memory cache.
 *
 * @param baseKey Cache namespace.
 * @param loader Async function to cache.
 * @returns Cached loader function.
 */
export function getCachedLoader<TData, TArgs extends unknown[] = []>(
  baseKey: string,
  loader: (...args: TArgs) => Promise<TData>,
): (...args: TArgs) => Promise<TData> {
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
 * Clear build cache entries.
 *
 * @param baseKey Optional key or keys to clear; clears all entries when omitted.
 * @returns Nothing.
 */
export function clearBuildCache(baseKey?: string | string[]): void {
  if (!baseKey) {
    buildCache.clear();
    return;
  }

  const baseKeys = Array.isArray(baseKey) ? baseKey : [baseKey];
  for (const key of buildCache.keys()) {
    for (const targetBaseKey of baseKeys) {
      if (key.startsWith(`${targetBaseKey}:`)) {
        buildCache.delete(key);
        break;
      }
    }
  }
}
