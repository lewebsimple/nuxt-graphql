import { print } from "graphql";
import { onScopeDispose, shallowRef, useNuxtApp, type Ref } from "#imports";
import type { ResultOf, SubscriptionName, VariablesOf } from "#graphql/registry";
import { normalizeError, type NormalizedError } from "../../shared/lib/error";
import { getOperationDocument } from "../../shared/lib/registry";
import type { IsEmptyObject } from "../../shared/lib/utils";

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
 * @param variables Subscription variables.
 * @returns Object with reactive data, error, and start/stop helpers.
 */
export function useGraphQLSubscription<TName extends SubscriptionName>(
  operationName: TName,
  ...args: IsEmptyObject<VariablesOf<TName>> extends true
    ? [variables?: VariablesOf<TName>]
    : [variables: VariablesOf<TName>]
): UseGraphQLSubscriptionReturn<TName> {
  const [variables] = args;

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
    unsubscribe = $getGraphQLSSEClient().subscribe<ResultOf<TName>>({ query, variables },
      {
        next: (result) => {
          if (result.errors?.length) {
            error.value = normalizeError(result.errors);
          }
          else if (result.data) {
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
