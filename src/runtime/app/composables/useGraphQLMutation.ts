import { ref, useNuxtApp } from "#imports";
// @ts-expect-error Types available at runtime
import { mutations, type MutationName, type MutationResult, type MutationVariables } from "#graphql/registry";
import { normalizeGraphQLError } from "../../shared/lib/graphql-error";
import { mergeHeaders } from "../../shared/lib/headers";

// useGraphQLMutation composable options
export interface UseGraphQLMutationOptions {
  headers?: HeadersInit;
}

// Mutate function options
export interface MutateOptions {
  headers?: HeadersInit;
}

/**
 * GraphQL mutation composable
 *
 * @param operationName Name of the GraphQL mutation operation in the registry
 * @returns Mutation handler
 */
export function useGraphQLMutation<N extends MutationName>(
  operationName: N,
  options?: UseGraphQLMutationOptions,
) {
  const { $getGraphQLClient } = useNuxtApp();
  const document = mutations[operationName];
  const pending = ref(false);

  // Mutation handler
  async function mutate(
    ...args: IsEmptyObject<MutationVariables<N>> extends true
      ? [variables?: MutationVariables<N>, mutateOptions?: MutateOptions]
      : [variables: MutationVariables<N>, mutateOptions?: MutateOptions]
  ) {
    pending.value = true;
    try {
      const [variables, mutateOptions] = args;
      const headers = mergeHeaders(options?.headers, mutateOptions?.headers);
      const data = await $getGraphQLClient().request<MutationResult<N>>(document, variables, headers);
      return { data, error: null };
    }
    catch (error) {
      return { data: null, error: normalizeGraphQLError(error) };
    }
    finally {
      pending.value = false;
    }
  }

  return { mutate, pending };
}
