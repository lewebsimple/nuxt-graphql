import { ref } from "#imports";
import type { MutationName, ResultOf, VariablesOf } from "#graphql/registry";
import { executeGraphQLHTTP, type ExecuteGraphQLHTTPOptions } from "../lib/execute-http";
import { normalizeError, type SafeResult } from "../../shared/lib/error";
import type { IsEmptyObject } from "../../shared/lib/utils";

/**
 * GraphQL mutation composable with pending state.
 *
 * @param operationName Operation name from the registry.
 * @param options HTTP options including headers.
 * @returns Mutation helpers and pending ref.
 */
export function useGraphQLMutation<TName extends MutationName>(
  operationName: TName,
  options?: ExecuteGraphQLHTTPOptions,
) {
  const pending = ref(false);

  // Execute the mutation and normalize errors.
  async function mutate(
    ...args: IsEmptyObject<VariablesOf<TName>> extends true
      ? [variables?: VariablesOf<TName>]
      : [variables: VariablesOf<TName>]
  ): Promise<SafeResult<ResultOf<TName>>> {
    const [variables] = args;
    try {
      pending.value = true;
      const data = await executeGraphQLHTTP<TName>(operationName, variables, options);
      return { data, error: null };
    }
    catch (error) {
      return { data: null, error: normalizeError(error) };
    }
    finally {
      pending.value = false;
    }
  }

  return { mutate, pending };
}
