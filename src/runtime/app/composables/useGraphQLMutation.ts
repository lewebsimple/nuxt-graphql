import { useNuxtApp } from "#app";
import { ref } from "vue";
import type { MutationName, ResultOf, VariablesOf } from "#graphql/registry";
import type { ExecuteGraphQLResult, IsEmptyObject } from "../../shared/lib/types";
import { getOperationDocument } from "../../shared/lib/registry";

export function useGraphQLMutation<TName extends MutationName>(
  operationName: TName,
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

    pending.value = true;
    try {
      return await $executeGraphQL<ResultOf<TName>>({ query: document, variables, operationName });
    }
    finally {
      pending.value = false;
    }
  };

  return { pending, mutate };
};
