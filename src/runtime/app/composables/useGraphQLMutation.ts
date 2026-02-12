import { useNuxtApp } from "#app";
import { ref } from "vue";
import type { MutationName, ResultOf, VariablesOf } from "#graphql/registry";
import type { ExecuteGraphQLResult, IsEmptyObject } from "../../shared/lib/types";
import { getOperationDocument } from "../../shared/lib/registry";
import { normalizeError, type NormalizedError } from "../../shared/lib/error";

/**
 * Mutation lifecycle hooks for optimistic updates and cache manipulation.
 *
 * @template TName Mutation operation name.
 * @template TContext Type of context returned by onMutate and passed to other hooks.
 */
export type MutationOptions<TName extends MutationName, TContext = unknown> = {
  /**
   * Callback invoked before the mutation executes.
   * Use for optimistic updates. Return value is passed as context to other hooks.
   *
   * @param variables Mutation variables.
   * @returns Context object for onSuccess/onError/onSettled hooks.
   */
  onMutate?: (variables: VariablesOf<TName>) => TContext | Promise<TContext>;

  /**
   * Callback invoked when the mutation succeeds.
   *
   * @param data Mutation result data.
   * @param variables Mutation variables.
   * @param context Context returned from onMutate (undefined if onMutate not provided or threw).
   */
  onSuccess?: (
    data: ResultOf<TName>,
    variables: VariablesOf<TName>,
    context: TContext | undefined,
  ) => void;

  /**
   * Callback invoked when the mutation fails.
   * Use for rolling back optimistic updates.
   *
   * @param error Normalized error.
   * @param variables Mutation variables.
   * @param context Context returned from onMutate (undefined if onMutate not provided or threw).
   */
  onError?: (
    error: NormalizedError,
    variables: VariablesOf<TName>,
    context: TContext | undefined,
  ) => void;

  /**
   * Callback invoked when the mutation completes (success or error).
   *
   * @param result Mutation result (data or error).
   * @param variables Mutation variables.
   * @param context Context returned from onMutate (undefined if onMutate not provided or threw).
   */
  onSettled?: (
    result: ExecuteGraphQLResult<ResultOf<TName>>,
    variables: VariablesOf<TName>,
    context: TContext | undefined,
  ) => void;
};

/**
 * GraphQL mutation composable with lifecycle hooks for optimistic updates.
 *
 * @template TName Mutation operation name.
 * @template TContext Type of context returned by onMutate and passed to other hooks.
 * @param operationName Mutation operation name.
 * @param options Optional mutation lifecycle hooks.
 * @returns Mutation state and mutate function.
 */
export function useGraphQLMutation<TName extends MutationName, TContext = unknown>(
  operationName: TName,
  options?: MutationOptions<TName, TContext>,
) {
  const { $executeGraphQL } = useNuxtApp();
  const document = getOperationDocument(operationName);
  const pending = ref(false);

  async function mutate(
    ...args: IsEmptyObject<VariablesOf<TName>> extends true
      ? [variables?: VariablesOf<TName>]
      : [variables: VariablesOf<TName>]
  ): Promise<ExecuteGraphQLResult<ResultOf<TName>>> {
    const [variables] = args;

    let context: TContext | undefined;

    // Execute onMutate hook before mutation
    if (options?.onMutate) {
      try {
        context = await options.onMutate(variables as VariablesOf<TName>);
      }
      catch (error) {
        const normalizedError = normalizeError(error);
        options?.onError?.(normalizedError, variables as VariablesOf<TName>, context);
        return { data: null, error: normalizedError };
      }
    }

    pending.value = true;
    try {
      const result = await $executeGraphQL<ResultOf<TName>>({ query: document, variables, operationName });

      // Execute success/error hooks based on result
      if (result.error) {
        options?.onError?.(result.error, variables as VariablesOf<TName>, context);
      }
      else if (result.data) {
        options?.onSuccess?.(result.data, variables as VariablesOf<TName>, context);
      }

      // Execute settled hook
      options?.onSettled?.(result, variables as VariablesOf<TName>, context);

      return result;
    }
    catch (error) {
      const normalizedError = normalizeError(error);
      const errorResult = { data: null, error: normalizedError };
      options?.onError?.(normalizedError, variables as VariablesOf<TName>, context);
      options?.onSettled?.(errorResult, variables as VariablesOf<TName>, context);
      return errorResult;
    }
    finally {
      pending.value = false;
    }
  }

  return { pending, mutate };
}
