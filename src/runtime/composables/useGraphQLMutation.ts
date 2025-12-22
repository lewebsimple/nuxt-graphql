import { ref } from "vue";
import { useNuxtApp } from "#imports";
import { mutations, type MutationName, type MutationResult, type MutationVariables } from "#graphql/registry";
import type { IsEmptyObject } from "../utils/helpers";

export function useGraphQLMutation<N extends MutationName>(operationName: N) {
  const document = mutations[operationName];
  const { $graphql } = useNuxtApp();

  const pending = ref(false);

  async function mutate(
    ...args: IsEmptyObject<MutationVariables<N>> extends true
      ? [variables?: MutationVariables<N>]
      : [variables: MutationVariables<N>]
  ): Promise<{ data: MutationResult<N> | null; error: Error | null }> {
    pending.value = true;
    try {
      const [variables] = args;
      const result = await $graphql().request({ document, variables }) as MutationResult<N>;
      return { data: result, error: null };
    }
    catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      return { data: null, error };
    }
    finally {
      pending.value = false;
    }
  }

  return { mutate, pending };
}
