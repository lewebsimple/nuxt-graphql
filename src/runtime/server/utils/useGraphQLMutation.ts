import type { H3Event } from "h3";
import { getGraphQLClient } from "./graphql-client";
import { mutations, type MutationName, type MutationResult, type MutationVariables } from "#graphql/registry";
import type { IsEmptyObject } from "../../utils/helpers";

/**
 * Server-side GraphQL mutation composable
 *
 * @param event H3 event
 * @param operationName Mutation operation name
 * @returns Object with mutate function
 */
export async function useGraphQLMutation<N extends MutationName>(
  event: H3Event,
  operationName: N,
) {
  const client = getGraphQLClient(event);

  async function mutate(
    ...args: IsEmptyObject<MutationVariables<N>> extends true
      ? [variables?: MutationVariables<N>, headers?: HeadersInit]
      : [variables: MutationVariables<N>, headers?: HeadersInit]
  ): Promise<{ data: MutationResult<N> | null; error: Error | null }> {
    try {
      const [variables, headers] = args;
      /** @ts-expect-error variables type conflicts with schema from playground */
      const result = await client.request(mutations[operationName], variables, headers) as MutationResult<N>;
      return { data: result, error: null };
    }
    catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      return { data: null, error };
    }
  }

  return { mutate };
}
