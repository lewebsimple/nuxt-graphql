import { useNuxtApp } from "#app";
import { print } from "graphql";
import { onScopeDispose, shallowRef, type Ref } from "vue";

import { normalizeError, type NormalizedError } from "../../shared/utils/error";
import {
  getOperationDocument,
  type ResultOf,
  type SubscriptionName,
  type VariablesInputOf,
} from "../../shared/utils/registry";

type UseGraphQLSubscriptionReturn<TName extends SubscriptionName> = {
  data: Readonly<Ref<ResultOf<TName> | null>>;
  error: Readonly<Ref<NormalizedError | null>>;
  start: () => void;
  stop: () => void;
};

/**
 * GraphQL subscription composable (client-side only).
 *
 * @param operationName Subscription operation name.
 * @param args Operation variables (if any).
 * @returns Object with reactive data, error, and start/stop helpers.
 */
export function useGraphQLSubscription<TName extends SubscriptionName>(
  operationName: TName,
  variables: VariablesInputOf<TName>,
): UseGraphQLSubscriptionReturn<TName> {
  const { $getGraphQLSSEClient } = useNuxtApp();

  const document = getOperationDocument(operationName);
  const query = print(document);

  const data = shallowRef<ResultOf<TName> | null>(null);
  const error = shallowRef<NormalizedError | null>(null);

  let unsubscribe: (() => void) | null = null;

  // Start the subscription
  function start() {
    stop();
    error.value = null;
    unsubscribe = $getGraphQLSSEClient().subscribe<ResultOf<TName>>(
      { query, variables },
      {
        next: (result) => {
          if (result.errors?.length) {
            error.value = normalizeError(result.errors);
          } else if (result.data) {
            data.value = result.data as ResultOf<TName>;
          }
        },
        error: (err) => {
          error.value = normalizeError(err);
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
