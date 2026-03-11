import { useNuxtApp } from "#app";
import { computed, ref } from "vue";

import type { NormalizedError } from "../../shared/utils/error";
import type { ExecuteGraphQLResult } from "../../shared/utils/execute";
import {
  type MutationName,
  type ResultOf,
  type VariablesInputOf,
} from "../../shared/utils/registry";

/**
 * Mutation lifecycle hooks for optimistic updates and cache manipulation.
 *
 * @template TName Mutation operation name.
 * @template TContext Type of context returned by onMutate and passed to other hooks.
 */
export type MutationHooks<TName extends MutationName, TContext = unknown> = {
  /**
   * Called before the mutation function is executed, allowing you to perform optimistic updates or prepare context for later hooks.
   *
   * @param variables The variables passed to the mutation function.
   * @returns A context object that will be passed to onSuccess and onError hooks, or a promise that resolves to such an object.
   */
  onMutate?: (variables: VariablesInputOf<TName>) => TContext | Promise<TContext>;

  /**
   * Called after a successful mutation, allowing you to update the cache or perform side effects based on the result.
   *
   * @param data The result of the mutation.
   * @param variables The variables passed to the mutation function.
   * @param context The context object returned by onMutate, if any.
   */
  onSuccess?: (
    data: ResultOf<TName>,
    variables: VariablesInputOf<TName>,
    context: TContext | undefined,
  ) => void;

  /**
   * Called after a failed mutation, allowing you to roll back optimistic updates or handle errors.
   *
   * @param error The error thrown by the mutation function.
   * @param variables The variables passed to the mutation function.
   * @param context The context object returned by onMutate, if any.
   */
  onError?: (
    error: NormalizedError,
    variables: VariablesInputOf<TName>,
    context: TContext | undefined,
  ) => void;

  /**
   * Called after the mutation has either succeeded or failed, allowing you to perform cleanup or final updates regardless of the outcome.
   *
   * @param result The result of the mutation, which may be a success or an error.
   * @param variables The variables passed to the mutation function.
   * @param context The context object returned by onMutate, if any.
   */
  onSettled?: (
    result: ExecuteGraphQLResult<TName>,
    variables: VariablesInputOf<TName>,
    context: TContext | undefined,
  ) => void;
};

/**
 * Create a mutation helper with a reactive pending state.
 *
 * @template TName Mutation operation name.
 * @template TContext Type of context returned by onMutate and passed to other hooks.
 * @param operationName Mutation operation name.
 * @param hooks Optional lifecycle hooks for the mutation.
 * @returns Mutation executor and pending state.
 */
export function useGraphQLMutation<TName extends MutationName, TContext = unknown>(
  operationName: TName,
  hooks?: MutationHooks<TName, TContext>,
) {
  const { $executeOperation } = useNuxtApp();
  const inFlightCount = ref(0);
  const pending = computed(() => inFlightCount.value > 0);

  /**
   * Execute the mutation with the given variables, managing the pending state and invoking lifecycle hooks as appropriate.
   *
   * @param variables Variables for the mutation.
   * @returns The result of the mutation.
   */
  async function mutate(variables: VariablesInputOf<TName>) {
    // Initialize context variable to hold the result of onMutate, if it exists.
    let context: TContext | undefined = undefined;

    inFlightCount.value += 1;

    try {
      // Invoke onMutate hook to allow for optimistic updates and context preparation
      if (hooks?.onMutate) {
        context = await hooks.onMutate(variables);
      }

      // Execute the GraphQL mutation operation
      const result = await $executeOperation({ operationName, variables });

      // Invoke onSuccess or onError hooks based on the result of the mutation
      if (result.error) {
        hooks?.onError?.(result.error, variables, context);
      } else {
        hooks?.onSuccess?.(result.data, variables, context);
      }

      // Invoke onSettled hook regardless of success or error
      hooks?.onSettled?.(result, variables, context);

      return result;
    } finally {
      inFlightCount.value = Math.max(0, inFlightCount.value - 1);
    }
  }

  return { pending, mutate };
}
