import { shallowRef, onScopeDispose, toValue, type MaybeRefOrGetter, type Ref } from "vue";
import { print } from "graphql";
import { useNuxtApp } from "#imports";
// @ts-expect-error Types available at runtime
import { subscriptions, type SubscriptionName, type SubscriptionResult, type SubscriptionVariables } from "#graphql/registry";
import { normalizeGraphQLError, type NormalizedGraphQLError } from "../../shared/lib/graphql-error";

// useGraphQLSubscription return type
export type UseGraphQLSubscriptionReturn<N extends SubscriptionName> = {
  data: Ref<SubscriptionResult<N> | null>;
  error: Ref<NormalizedGraphQLError | null>;
  start: () => void;
  stop: () => void;
};

/**
 * GraphQL subscription composable (client-side only)
 *
 * @param operationName Subscription operation name
 * @param args Variables (reactive or not)
 * @returns Object with reactive data, error and  start / stop helpers
 */
export function useGraphQLSubscription<N extends SubscriptionName>(
  operationName: N,
  ...args: IsEmptyObject<SubscriptionVariables<N>> extends true
    ? [variables?: MaybeRefOrGetter<SubscriptionVariables<N>>]
    : [variables: MaybeRefOrGetter<SubscriptionVariables<N>>]
): UseGraphQLSubscriptionReturn<N> {
  // Prevent server-side usage
  if (import.meta.server) {
    throw new Error("useGraphQLSubscription is not available on the server");
  }

  const { $getGraphQLSSEClient } = useNuxtApp();
  const [variables] = args;

  const data = shallowRef<SubscriptionResult<N> | null>(null) as Ref<SubscriptionResult<N> | null>;
  const error = shallowRef<NormalizedGraphQLError | null>(null) as Ref<NormalizedGraphQLError | null>;

  let unsubscribe: (() => void) | null = null;

  // Start the subscription
  function start() {
    stop();
    error.value = null;
    unsubscribe = $getGraphQLSSEClient().subscribe<SubscriptionResult<N>>(
      {
        query: print(subscriptions[operationName]),
        variables: toValue(variables),
      },
      {
        next: (result) => {
          if (result.errors?.length) {
            error.value = normalizeGraphQLError({ errors: result.errors });
          }
          else if (result.data) {
            data.value = result.data as SubscriptionResult<N>;
          }
        },
        error: (err) => {
          error.value = normalizeGraphQLError(err);
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

  // Start automatically and stop on scope dispose
  start();
  onScopeDispose(stop);

  return { data, error, start, stop };
}
