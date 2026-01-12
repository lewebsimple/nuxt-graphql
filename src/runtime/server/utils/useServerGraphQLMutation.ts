import type { H3Event } from "h3";
// @ts-expect-error Types available at runtime
import { mutations, type MutationName, type MutationResult, type MutationVariables } from "#graphql/registry";
import { executeServerGraphQL, type ExecuteServerGraphQLOptions } from "../lib/execute-server-graphql";
import { mergeHeaders } from "../../shared/lib/headers";

export interface ServerMutateOptions {
  headers?: HeadersInit;
}

export function useServerGraphQLMutation<N extends MutationName>(
  event: H3Event,
  operationName: N,
  options?: ExecuteServerGraphQLOptions,
) {
  async function mutate(
    ...args: IsEmptyObject<MutationVariables<N>> extends true
      ? [variables?: MutationVariables<N>, mutateOptions?: ServerMutateOptions]
      : [variables: MutationVariables<N>, mutateOptions?: ServerMutateOptions]
  ): Promise<MutationResult<N>> {
    const [variables, mutateOptions] = args;

    return executeServerGraphQL(event, mutations[operationName], variables, {
      ...options,
      headers: mergeHeaders(options?.headers, mutateOptions?.headers),
    }) as Promise<MutationResult<N>>;
  }

  return { mutate };
}
