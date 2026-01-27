import type { QueryName, ResultOf, VariablesOf } from "#graphql/registry";
import { useNuxtApp } from "#imports";
import { normalizeError } from "../../shared/lib/error";
import { getOperationDocument } from "../../shared/lib/registry";
import type { ExecuteGraphQLResult, IsEmptyObject } from "../../shared/lib/types";

export async function useGraphQLQuery<TName extends QueryName>(
  operationName: TName,
  ...args: IsEmptyObject<VariablesOf<TName>> extends true
    ? [variables?: VariablesOf<TName>]
    : [variables: VariablesOf<TName>]
): Promise<ExecuteGraphQLResult<ResultOf<TName>>> {
  const { $executeGraphQL } = useNuxtApp();
  const [variables] = args;
  const document = getOperationDocument(operationName);

  try {
    return await $executeGraphQL<ResultOf<TName>, VariablesOf<TName>>(
      { query: document, variables, operationName },
    );
  }
  catch (error) {
    return { data: null, error: normalizeError(error) };
  }
}
