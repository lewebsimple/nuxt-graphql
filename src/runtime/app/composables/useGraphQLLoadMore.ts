import type { QueryName, ResultOf, VariablesOf } from "#graphql/registry";
import { computed, ref, shallowRef, toValue, useAsyncGraphQLQuery, watch, type ComputedRef, type MaybeRef, type Ref } from "#imports";
import { hash } from "ohash";

type PageInfoFragment = {
  hasNextPage: boolean;
  endCursor: string | undefined;
};

type Connection<TItem> = {
  nodes: TItem[];
  pageInfo: PageInfoFragment;
};

export async function useGraphQLLoadMore<
  TQueryName extends QueryName,
  TConnection extends Connection<unknown>,
>(
  queryName: TQueryName,
  inputVars: MaybeRef<Omit<VariablesOf<TQueryName>, "after">>,
  getConnection: (data?: ResultOf<TQueryName>) => TConnection | undefined,
) {
  type TItem = TConnection["nodes"][number];

  // Current pagination cursor with set of added cursors to prevent duplicate fetches
  const after = ref<string | null>(null);
  const addedCursors = new Set<string>();

  // Query input (excluding pagination) and its hash for changes detection
  const queryInput = computed(() => toValue(inputVars));
  const queryInputHash = computed(() => hash(queryInput.value));
  const queryVars = computed(() => ({
    ...queryInput.value,
    after: after.value,
  }));

  // Execute GraphQL query
  const query = await useAsyncGraphQLQuery(
    queryName,
    queryVars as ComputedRef<VariablesOf<TQueryName>>,
    {},
  );

  const items: Ref<TItem[]> = shallowRef(getConnection(query.data.value)?.nodes || []);
  const isLoadingMore = ref(false);

  // Pagination info
  const hasNextPage = computed(
    () => getConnection(query.data.value)?.pageInfo?.hasNextPage ?? false,
  );
  const endCursor = computed(() => getConnection(query.data.value)?.pageInfo?.endCursor ?? null);

  // Reset function
  function reset(clearProducts = false) {
    after.value = null;
    addedCursors.clear();
    if (clearProducts) {
      items.value = [];
    }
  }

  // Watch query results to seed/append products
  watch(
    () => getConnection(query.data.value),
    (connection) => {
      const newItems = connection?.nodes || [];
      if (after.value === null) {
        items.value = newItems;
      }
      else {
        items.value = [...items.value, ...newItems];
      }
      isLoadingMore.value = false;
    },
  );

  // Reset when input changes
  watch(queryInputHash, () => reset());

  // Load more function to fetch next page of products
  function loadMore() {
    if (
      isLoadingMore.value
      || !hasNextPage.value
      || !endCursor.value
      || addedCursors.has(endCursor.value)
    ) {
      return;
    }
    addedCursors.add(endCursor.value);
    isLoadingMore.value = true;
    after.value = endCursor.value;
  }

  return {
    items,
    pending: query.pending,
    error: query.error,
    reset,
    hasNextPage,
    isLoadingMore,
    loadMore,
  };
}
