import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createCacheStore,
  getCacheStore,
  getOrCreatePromise,
  invalidateAllCache,
  invalidateCachePrefix,
  readCachedValue,
  resolveCacheEntry,
  shouldBypassCache,
} from "../src/runtime/app/lib/cache";

/** Cast a plain object to the Nuxt app shape expected by `getCacheStore`. */
function asNuxtApp(app: object) {
  return app as Parameters<typeof getCacheStore>[0];
}

/** Create a promise together with its resolver. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("cache store binding", () => {
  it("reuses a single store per Nuxt app instance", () => {
    const nuxtApp = asNuxtApp({});
    expect(getCacheStore(nuxtApp)).toBe(getCacheStore(nuxtApp));
  });

  it("gives every Nuxt app instance its own store", () => {
    // On the Nitro server `nuxtApp` is created per HTTP request, so distinct instances must not
    // share cache state — module-scoped state would be shared by every concurrent request.
    expect(getCacheStore(asNuxtApp({}))).not.toBe(getCacheStore(asNuxtApp({})));
  });
});

describe("in-flight request de-duplication", () => {
  it("shares an in-flight promise within a single store", async () => {
    const store = createCacheStore();
    const pending = deferred<string>();
    let created = 0;

    const create = () => {
      created += 1;
      return pending.promise;
    };

    const first = getOrCreatePromise(store, "gql:1:global:Profiles:x", create);
    const second = getOrCreatePromise(store, "gql:1:global:Profiles:x", create);

    expect(first).toBe(second);
    expect(created).toBe(1);

    pending.resolve("value");
    await first;
  });

  it("never shares an in-flight promise across stores", async () => {
    // Two concurrent server requests resolve the same cache key (a query without variables
    // produces an identical key for every user), each with its own data.
    const requestA = createCacheStore();
    const requestB = createCacheStore();
    const key = "gql:1:global:MemberAreaProfiles:x";

    const responseA = deferred<string>();
    const responseB = deferred<string>();

    const promiseA = getOrCreatePromise(requestA, key, () => responseA.promise);
    const promiseB = getOrCreatePromise(requestB, key, () => responseB.promise);

    responseA.resolve("alice");
    responseB.resolve("bob");

    expect(await promiseA).toBe("alice");
    expect(await promiseB).toBe("bob");
    expect(readCachedValue(requestA, key)).toBe("alice");
    expect(readCachedValue(requestB, key)).toBe("bob");
  });
});

describe("cached values", () => {
  it("keeps the resolved value alongside its metadata", () => {
    const store = createCacheStore();
    const key = "gql:1:global:Profiles:x";

    expect(readCachedValue(store, key)).toBeUndefined();

    resolveCacheEntry(store, key, { viewer: "alice" });

    expect(readCachedValue(store, key)).toEqual({ viewer: "alice" });
  });
});

describe("invalidation", () => {
  // Entries are invalidated by comparing timestamps, so the clock has to move between writing an
  // entry and invalidating it.
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("scopes prefix invalidation to a single store", () => {
    const requestA = createCacheStore();
    const requestB = createCacheStore();
    const key = "gql:1:global:Profiles:x";

    resolveCacheEntry(requestA, key, "a");
    resolveCacheEntry(requestB, key, "b");
    vi.advanceTimersByTime(1);

    invalidateCachePrefix(requestA, "gql:1:global:");

    expect(shouldBypassCache(requestA, key, requestA.entries.get(key)?.createdAt)).toBe(true);
    expect(shouldBypassCache(requestB, key, requestB.entries.get(key)?.createdAt)).toBe(false);
  });

  it("scopes global invalidation to a single store", () => {
    const requestA = createCacheStore();
    const requestB = createCacheStore();
    const key = "gql:1:global:Profiles:x";

    resolveCacheEntry(requestA, key, "a");
    resolveCacheEntry(requestB, key, "b");
    vi.advanceTimersByTime(1);

    invalidateAllCache(requestA);

    expect(shouldBypassCache(requestA, key, requestA.entries.get(key)?.createdAt)).toBe(true);
    expect(shouldBypassCache(requestB, key, requestB.entries.get(key)?.createdAt)).toBe(false);
  });
});
