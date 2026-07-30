import { hash } from "ohash";
import { computed, ref, shallowRef, toValue, watch, type MaybeRefOrGetter } from "vue";

import type { QueryName, ResultOf, VariablesOf } from "../../shared/utils/registry";

import { useAsyncGraphQLQuery } from "./useAsyncGraphQLQuery";

type PageInfoFragment = {
  hasNextPage: boolean;
  endCursor: string | null | undefined;
};

type Connection<TItem> = {
  nodes: TItem[];
  pageInfo: PageInfoFragment;
};

/**
 * Executes a GraphQL query with cursor-based pagination to load more items as needed.
 * @param operationName The name of the GraphQL query operation.
 * @param variables The variables for the GraphQL query, excluding the "after" cursor.
 * @param getConnection A function to extract the connection data from the query result.
 * @returns An object containing the items, loading state, error state, and pagination functions.
 */
export async function useGraphQLLoadMore<
  TName extends QueryName,
  TConnection extends Connection<unknown>,
>(
  operationName: TName,
  variables: MaybeRefOrGetter<Omit<VariablesOf<TName>, "after">>,
  getConnection: (data?: ResultOf<TName>) => TConnection | null | undefined,
) {
  type TItem = TConnection["nodes"][number];

  // Current pagination cursor and the last requested cursor to prevent duplicate requests
  const after = ref<string | null>(null);
  const lastRequestedCursor = ref<string | null>(null);

  // Compute the base variables and their hash to detect changes in query inputs
  const baseVariables = computed(() => toValue(variables));
  const baseVariablesHash = computed(() => hash(baseVariables.value));
  const queryVariables = computed<VariablesOf<TName>>(
    () =>
      ({
        ...baseVariables.value,
        after: after.value,
      }) as VariablesOf<TName>,
  );

  // State for items and loading status
  const items = shallowRef<TItem[]>([]);
  const isLoadingMore = ref(false);

  // Execute GraphQL query
  const query = await useAsyncGraphQLQuery<TName>(operationName, queryVariables);

  // Extract connection data and pagination info from the query result
  const connection = computed(() => getConnection(query.data.value));
  const hasNextPage = computed(() => connection.value?.pageInfo?.hasNextPage ?? false);
  const endCursor = computed(() => connection.value?.pageInfo?.endCursor ?? null);

  // Seed items from the initial (already-awaited) query result
  items.value = connection.value?.nodes ?? [];

  // Reset pagination when the base query inputs change; items are repopulated
  // by the pending watcher once the new fetch resolves
  let lastInputHash = baseVariablesHash.value;
  watch(baseVariablesHash, (newHash) => {
    if (newHash === lastInputHash) return;
    lastInputHash = newHash;
    after.value = null;
    lastRequestedCursor.value = null;
    items.value = [];
  });

  // Apply fetched nodes when the query data actually changes — watching `data` (not `pending`)
  // covers background SWR revalidations, which update the data ref without ever toggling
  // `pending`. It also avoids reading stale `connection` data on the synchronous tick where
  // `after`/`isLoadingMore` were just mutated (the data ref has not changed yet at that point).
  watch(
    () => query.data.value,
    () => {
      const newItems = connection.value?.nodes ?? [];
      if (after.value === null) {
        items.value = newItems;
      } else if (isLoadingMore.value) {
        items.value = [...items.value, ...newItems];
        isLoadingMore.value = false;
      }
      // else: a background revalidation of a later page — the accumulated list cannot be
      // re-spliced reliably without tracking page boundaries, so items are left as-is.
    },
    { flush: "post" },
  );

  // A failed request never updates `data`, so release the load-more lock when the request
  // settles with an error — otherwise `loadMore()` would be blocked forever.
  watch(
    () => query.pending.value,
    (pending, wasPending) => {
      if (!pending && wasPending && query.error.value) {
        isLoadingMore.value = false;
      }
    },
    { flush: "post" },
  );

  // Load more items based on the current cursor
  function loadMore() {
    const cursor = endCursor.value;
    if (
      isLoadingMore.value ||
      !hasNextPage.value ||
      !cursor ||
      cursor === lastRequestedCursor.value
    ) {
      return;
    }
    lastRequestedCursor.value = cursor;
    isLoadingMore.value = true;
    after.value = cursor;
  }

  // Reset the pagination and items
  function reset() {
    after.value = null;
    lastRequestedCursor.value = null;
    items.value = [];
  }

  return {
    items,
    pending: query.pending,
    error: query.error,
    hasNextPage,
    isLoadingMore,
    loadMore,
    reset,
  };
}
