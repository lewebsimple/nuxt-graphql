import type { H3Event } from "h3";
import { createGraphQLClient } from "./graphql-client";
import { mutations, type MutationName, type MutationResult, type MutationVariables } from "#graphql/registry";
import type { IsEmptyObject } from "../../utils/helpers";

export async function useGraphQLMutation<N extends MutationName>(
  event: H3Event,
  operationName: N,
) {
  const client = createGraphQLClient(event);
  async function mutate(
    ...args: IsEmptyObject<MutationVariables<N>> extends true
      ? [variables?: MutationVariables<N>]
      : [variables: MutationVariables<N>]
  ): Promise<{ data: MutationResult<N> | null; error: Error | null }> {
    try {
      const [variables] = args;
      const result = await client.request(mutations[operationName], variables) as MutationResult<N>;
      return { data: result, error: null };
    }
    catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      return { data: null, error };
    }
  }
  return { mutate };
}
