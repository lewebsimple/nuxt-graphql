import { ref, shallowRef, onScopeDispose, toValue, type MaybeRefOrGetter } from "vue";
import { print } from "graphql";
import { useNuxtApp } from "#imports";

import { subscriptions, type SubscriptionName, type SubscriptionResult, type SubscriptionVariables } from "#graphql/registry";
import type { IsEmptyObject } from "../utils/helpers";

export function useGraphQLSubscription<N extends SubscriptionName>(
  operationName: N,
  ...args: IsEmptyObject<SubscriptionVariables<N>> extends true
    ? [variables?: MaybeRefOrGetter<SubscriptionVariables<N>>]
    : [variables: MaybeRefOrGetter<SubscriptionVariables<N>>]
) {
  const { $graphqlSSE } = useNuxtApp();
  const [variables] = args;

  const data = shallowRef<SubscriptionResult<N> | null>(null);
  const error = ref<Error | null>(null);

  let unsubscribe: (() => void) | null = null;

  function start() {
    stop();
    error.value = null;
    unsubscribe = $graphqlSSE().subscribe<SubscriptionResult<N>>(
      {
        query: print(subscriptions[operationName]),
        variables: toValue(variables),
      },
      {
        next: (result) => {
          if (result.errors?.length) {
            error.value = new Error(result.errors.map((e) => e.message).join(", "));
          }
          else if (result.data) {
            data.value = result.data;
          }
        },
        error: (e) => {
          error.value = e instanceof Error ? e : new Error(String(e));
        },
        complete: () => {
          unsubscribe = null;
        },
      },
    );
  }

  function stop() {
    unsubscribe?.();
    unsubscribe = null;
  }

  if (import.meta.client) {
    start();
  }

  onScopeDispose(stop);

  return { data, error, start, stop };
}
