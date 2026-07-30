import { afterEach, describe, expect, it } from "vitest";
import type { Ref } from "vue";

import { useAsyncGraphQLQuery } from "../src/runtime/app/composables/useAsyncGraphQLQuery";
import type { CacheConfig } from "../src/runtime/app/lib/cache-config";

import { createStubNuxtApp, setActiveNuxtApp, type StubExecuteResult } from "./stubs/nuxt-app";

// The composable is typed against the generated operation registry, which unit tests do not have;
// call it through an untyped view of the same function.
type QueryOptions = {
  cache?: Partial<CacheConfig>;
  scope?: string;
  transform?: (input: never) => unknown;
};
type AsyncDataLike = Promise<unknown> & {
  data: Ref<unknown>;
  error: Ref<unknown>;
  refresh: () => Promise<void>;
};
const useQuery = useAsyncGraphQLQuery as unknown as (
  operationName: string,
  variables: unknown,
  options?: QueryOptions,
) => AsyncDataLike;

/** Create a promise together with its resolver. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

/** Let queued microtasks and timers run. */
function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

afterEach(() => {
  setActiveNuxtApp(undefined);
});

describe("concurrent server requests", () => {
  it("never serves one request's data to another", async () => {
    // `MemberAreaProfiles` takes no variables, so both users produce an identical cache key. On the
    // server `nuxtApp` is per request; a cache shared beyond it would hand the second render the
    // first render's in-flight promise, and with it the first user's data.
    const alice = deferred<StubExecuteResult>();
    const bob = deferred<StubExecuteResult>();

    const requestA = createStubNuxtApp(() => alice.promise);
    const requestB = createStubNuxtApp(() => bob.promise);

    setActiveNuxtApp(requestA);
    const queryA = useQuery("MemberAreaProfiles", {});

    setActiveNuxtApp(requestB);
    const queryB = useQuery("MemberAreaProfiles", {});

    // Both renders are in flight before either response arrives.
    expect(requestA.calls).toBe(1);
    expect(requestB.calls).toBe(1);

    alice.resolve({ data: { viewer: "alice" } });
    bob.resolve({ data: { viewer: "bob" } });
    await Promise.all([queryA, queryB]);

    expect(queryA.data.value).toEqual({ viewer: "alice" });
    expect(queryB.data.value).toEqual({ viewer: "bob" });
  });
});

describe("transformed results", () => {
  // Each test uses its own cache scope so a leaked entry cannot mask another test.
  const response = { data: { viewer: { members: [{ id: "1" }] } } };
  const transform = (result: { viewer?: { members?: { id: string }[] } }) => ({
    profiles: result.viewer?.members ?? [],
    hasMore: false,
  });
  const transformed = { profiles: [{ id: "1" }], hasMore: false };

  it("does not transform an already transformed cached result", async () => {
    // `useAsyncData` overwrites `payload.data[key]` with the transformed value, so the query cache
    // has to keep the raw result somewhere else — otherwise `cache-first` feeds the transformed
    // value back and `transform` runs a second time, here yielding an empty profile list.
    const nuxtApp = createStubNuxtApp(async () => response);
    setActiveNuxtApp(nuxtApp);

    const query = useQuery(
      "MemberAreaProfiles",
      {},
      {
        scope: "cache-first",
        cache: { policy: "cache-first" },
        transform: transform as QueryOptions["transform"],
      },
    );
    await query;

    expect(query.data.value).toEqual(transformed);

    await query.refresh();

    expect(query.data.value).toEqual(transformed);
    expect(nuxtApp.calls).toBe(1);
  });

  it("transforms the result of a background revalidation", async () => {
    // A `swr` revalidation resolves outside the `useAsyncData` pipeline, so the composable applies
    // `transform` itself before publishing the fresh value to the rendered data.
    const revalidation = deferred<StubExecuteResult>();
    const nuxtApp = createStubNuxtApp(async () =>
      nuxtApp.calls === 1 ? response : revalidation.promise,
    );
    setActiveNuxtApp(nuxtApp);

    const query = useQuery(
      "MemberAreaProfiles",
      {},
      {
        scope: "swr",
        cache: { policy: "swr" },
        transform: transform as QueryOptions["transform"],
      },
    );
    await query;
    expect(nuxtApp.calls).toBe(1);

    // Serves the cached value immediately and revalidates in the background.
    await query.refresh();
    expect(nuxtApp.calls).toBe(2);
    expect(query.data.value).toEqual(transformed);

    revalidation.resolve({ data: { viewer: { members: [{ id: "1" }, { id: "2" }] } } });
    await flush();

    expect(query.data.value).toEqual({
      profiles: [{ id: "1" }, { id: "2" }],
      hasMore: false,
    });
  });
});
