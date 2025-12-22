import { ref } from "vue";

import { useGraphQL } from "./useGraphQL";
import { mutations, type MutationName, type MutationResult, type MutationVariables } from "#graphql/registry";
import type { IsEmptyObject } from "../utils/helpers";

export function useGraphQLMutation<N extends MutationName>(operationName: N) {
  const document = mutations[operationName];
  const { request } = useGraphQL();

  const pending = ref(false);

  async function mutate(
    ...args: IsEmptyObject<MutationVariables<N>> extends true
      ? [variables?: MutationVariables<N>]
      : [variables: MutationVariables<N>]
  ): Promise<{ data: MutationResult<N> | null; error: Error | null }> {
    pending.value = true;
    try {
      const result = await request(document, args[0] as Record<string, unknown>) as MutationResult<N>;
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
