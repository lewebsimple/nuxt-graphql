import { ref, onScopeDispose, toValue, type MaybeRefOrGetter, type Ref } from "vue";
import { print } from "graphql";
import { useNuxtApp } from "#imports";
import { subscriptions, type SubscriptionName, type SubscriptionResult, type SubscriptionVariables } from "#graphql/registry";
import { wrapError, type GraphQLClientError } from "../utils/graphql-error";
import type { IsEmptyObject } from "../../../helpers/is-empty-object";

// Return type for subscription composable
export type UseGraphQLSubscriptionReturn<N extends SubscriptionName> = {
  data: Ref<SubscriptionResult<N> | null>;
  error: Ref<GraphQLClientError | null>;
  start: () => void;
  stop: () => void;
};

/**
 * Client-side GraphQL subscription composable using SSE
 *
 * @param operationName Subscription operation name
 * @param args Variables (can be reactive)
 * @returns Object with data, error, start, and stop
 */
export function useGraphQLSubscription<N extends SubscriptionName>(
  operationName: N,
  ...args: IsEmptyObject<SubscriptionVariables<N>> extends true
    ? [variables?: MaybeRefOrGetter<SubscriptionVariables<N>>]
    : [variables: MaybeRefOrGetter<SubscriptionVariables<N>>]
): UseGraphQLSubscriptionReturn<N> {
  const { $graphqlSSE } = useNuxtApp();
  const [variables] = args;

  const data = ref<SubscriptionResult<N> | null>(null);
  const error = ref<GraphQLClientError | null>(null);

  let unsubscribe: (() => void) | null = null;

  // Start the subscription
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
            error.value = wrapError({ errors: result.errors });
          }
          else if (result.data) {
            data.value = result.data as SubscriptionResult<N>;
          }
        },
        error: (e) => {
          error.value = wrapError(e);
        },
        complete: () => {
          unsubscribe = null;
        },
      },
    );
  }

  // Stop the subscription
  function stop() {
    unsubscribe?.();
    unsubscribe = null;
  }

  // Auto-start on client-side
  if (import.meta.client) {
    start();
  }

  onScopeDispose(stop);

  return { data, error, start, stop } as UseGraphQLSubscriptionReturn<N>;
}
