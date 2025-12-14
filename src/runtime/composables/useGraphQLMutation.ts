import { ref, type Ref } from "vue";

import { useGraphQL } from "./useGraphQL";
import { mutations, type MutationName, type MutationResult, type MutationVariables } from "#graphql/registry";

type IsEmptyObject<T> = T extends Record<string, never> ? true : keyof T extends never ? true : false;

export function useGraphQLMutation<N extends MutationName>(operationName: N) {
  const document = mutations[operationName];
  const { request } = useGraphQL();

  const data = ref<MutationResult<N> | null>(null) as Ref<MutationResult<N> | null>;
  const error = ref<Error | null>(null);
  const pending = ref(false);

  async function mutate(
    ...args: IsEmptyObject<MutationVariables<N>> extends true
      ? [variables?: MutationVariables<N>]
      : [variables: MutationVariables<N>]
  ): Promise<MutationResult<N>> {
    pending.value = true;
    error.value = null;
    try {
      const result = await request(document, args[0] as Record<string, unknown>) as MutationResult<N>;
      data.value = result;
      return result;
    }
    catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e));
      throw e;
    }
    finally {
      pending.value = false;
    }
  }

  return { mutate, data, error, pending };
}
