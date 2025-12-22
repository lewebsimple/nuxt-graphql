import { ref } from "vue";
import { useNuxtApp } from "#imports";
import { mutations, type MutationName, type MutationResult, type MutationVariables } from "#graphql/registry";
import type { IsEmptyObject } from "../utils/helpers";
import { wrapError } from "../utils/graphql-error";

export function useGraphQLMutation<N extends MutationName>(operationName: N) {
  const document = mutations[operationName];
  const { $graphql } = useNuxtApp();
  const pending = ref(false);
  async function mutate(
    ...args: IsEmptyObject<MutationVariables<N>> extends true
      ? [variables?: MutationVariables<N>, headers?: HeadersInit]
      : [variables: MutationVariables<N>, headers?: HeadersInit]
  ): Promise<{ data: MutationResult<N> | null; error: Error | null }> {
    pending.value = true;
    try {
      const [variables, headers] = args;
      const result = await $graphql().request(document, variables, headers) as MutationResult<N>;
      return { data: result, error: null };
    }
    catch (error) {
      return { data: null, error: wrapError(error) };
    }
    finally {
      pending.value = false;
    }
  }
  return { mutate, pending };
}
