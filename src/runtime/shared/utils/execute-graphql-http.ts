import { print } from "graphql";
import { normalizeError } from "../lib/error";
import { mergeHeaders, type HeadersInput } from "../lib/headers";
import type { ExecuteGraphQLInput, ExecuteGraphQLResult, GraphQLVariables } from "../lib/types";

export type ExecuteGraphQLHTTPOptions = {
  endpoint: string;
  headers?: HeadersInput;
};

type GraphQLHTTPResponse<TResult> = {
  data?: TResult;
  errors?: unknown;
};

export async function executeGraphQLHTTP<
  TResult = unknown,
  TVariables extends GraphQLVariables = GraphQLVariables,
>(
  { query, variables, operationName }: ExecuteGraphQLInput<TVariables>,
  { endpoint, headers }: ExecuteGraphQLHTTPOptions,
): Promise<ExecuteGraphQLResult<TResult>> {
  try {
    const { data, errors } = await $fetch<GraphQLHTTPResponse<TResult>>(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...mergeHeaders(headers),
      },
      body: JSON.stringify({
        query: typeof query === "string" ? query : print(query),
        variables,
        operationName,
      }),
    });
    if (errors) {
      return { data: null, error: normalizeError(errors) };
    }
    if (!data) {
      return { data: null, error: normalizeError(new Error("No data received from GraphQL server")) };
    }
    return { data, error: null };
  }
  catch (error) {
    return {
      data: null,
      error: normalizeError(error),
    };
  }
}
