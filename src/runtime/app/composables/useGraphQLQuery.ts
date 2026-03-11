import { useNuxtApp } from "#app";

import type { ExecuteGraphQLResult } from "../../shared/utils/execute";
import type { QueryName, VariablesInputOf } from "../../shared/utils/registry";

/**
 * Execute a GraphQL query operation once.
 *
 * @param operationName Query operation name.
 * @param variables Query variables.
 * @returns Query execution result.
 */
export async function useGraphQLQuery<TName extends QueryName>(
  operationName: TName,
  variables: VariablesInputOf<TName>,
): Promise<ExecuteGraphQLResult<TName>> {
  const { $executeOperation } = useNuxtApp();
  return $executeOperation({ operationName, variables });
}
