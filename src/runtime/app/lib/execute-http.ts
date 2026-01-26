import { useNuxtApp } from "#app";
import type { QueryName, MutationName, ResultOf, VariablesOf } from "#graphql/registry";
import { mergeHeaders } from "../../shared/lib/headers";
import { getOperationDocument } from "../../shared/lib/registry";

export type ExecuteGraphQLHTTPOptions = {
  headers?: HeadersInput;
};

/**
 * Execute a GraphQL operation over HTTP using graphql-request.
 *
 * @param operationName Operation name from the registry.
 * @param variables Operation variables.
 * @param options Optional HTTP headers.
 * @returns Operation result data.
 */
export async function executeGraphQLHTTP<TName extends QueryName | MutationName>(
  operationName: TName,
  variables?: VariablesOf<TName>,
  options?: ExecuteGraphQLHTTPOptions,
): Promise<ResultOf<TName>> {
  const client = useNuxtApp().$getGraphQLClient();
  const document = getOperationDocument(operationName);
  return client.request(document, variables, mergeHeaders(options?.headers));
}
