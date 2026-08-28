import { afterEach, describe, expect, it } from "vitest";
import { nextTick, type Ref } from "vue";

import { useAsyncGraphQLQuery } from "../src/runtime/app/composables/useAsyncGraphQLQuery";
import { useGraphQLLoadMore } from "../src/runtime/app/composables/useGraphQLLoadMore";

import { createStubNuxtApp, setActiveNuxtApp, setRuntimeCacheConfig } from "./stubs/nuxt-app";

// Untyped views of the registry-typed composables (unit tests have no generated registry).
type Item = { id: string };
type Result = {
  list?: { nodes: Item[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
};
type LoadMoreResult = {
  items: Ref<Item[]>;
  pending: Ref<boolean>;
  error: Ref<unknown>;
  hasNextPage: Ref<boolean>;
  isLoadingMore: Ref<boolean>;
  loadMore: () => void;
  reset: () => void;
  connection: Ref<Result["list"] | null | undefined>;
  refresh: () => Promise<void>;
};
const useLoadMore = useGraphQLLoadMore as unknown as (
  operationName: string,
  variables: unknown,
  getConnection: (data?: Result) => Result["list"],
) => Promise<LoadMoreResult>;
const useQuery = useAsyncGraphQLQuery as unknown as (
  operationName: string,
  variables: unknown,
) => Promise<{ refresh: () => Promise<void> }> & { refresh: () => Promise<void> };

/** Let queued microtasks and timers run. */
function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Create a promise together with its resolver. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function page(nodes: Item[]): { data: Result } {
  return { data: { list: { nodes, pageInfo: { hasNextPage: false, endCursor: null } } } };
}

afterEach(() => {
  setActiveNuxtApp(undefined);
  setRuntimeCacheConfig({});
});

describe("useGraphQLLoadMore surface", () => {
  it("exposes the connection with its extra metadata and a targeted refresh", async () => {
    // Consumers used to issue a second, identical query just to read `pageInfo.total`, and to
    // reach for `refreshNuxtData()` (re-running every async data in the app) for a retry button.
    const withTotal = {
      data: {
        list: {
          nodes: [{ id: "a" }],
          pageInfo: { hasNextPage: false, endCursor: null, total: 42 },
        },
      },
    };
    const nuxtApp = createStubNuxtApp(() => Promise.resolve(withTotal));
    setActiveNuxtApp(nuxtApp);

    const list = await useLoadMore("Items", {}, (data) => data?.list);

    const pageInfo = list.connection.value?.pageInfo as { total?: number } | undefined;
    expect(pageInfo?.total).toBe(42);
    expect(nuxtApp.calls).toBe(1);

    await list.refresh();
    expect(nuxtApp.calls).toBe(2);
  });
});

describe("useGraphQLLoadMore with swr", () => {
  it("updates items when a background revalidation lands", async () => {
    // An SWR revalidation updates the query data ref without ever toggling `pending`; the
    // accumulated items must follow the data, not the pending flag.
    setRuntimeCacheConfig({ policy: "swr" });

    const v1 = [{ id: "a" }];
    const v2 = [{ id: "a" }, { id: "b" }];
    const revalidation = deferred<{ data: Result }>();
    const nuxtApp = createStubNuxtApp(() =>
      nuxtApp.calls === 1 ? Promise.resolve(page(v1)) : revalidation.promise,
    );
    setActiveNuxtApp(nuxtApp);

    const list = await useLoadMore("Items", {}, (data) => data?.list);
    expect(list.items.value).toEqual(v1);

    // Another consumer of the same query (same operation + variables) refreshes: swr serves the
    // cached value and revalidates in the background, updating the shared data ref.
    const other = useQuery("Items", { after: null });
    await other;
    await other.refresh();
    expect(nuxtApp.calls).toBe(2);

    revalidation.resolve(page(v2));
    await flush();
    await nextTick();

    expect(list.items.value).toEqual(v2);
  });
});
