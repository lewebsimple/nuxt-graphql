import { defineNuxtPlugin, useRequestHeaders, useRuntimeConfig } from "#app";
import type { HeadersInput } from "../../shared/lib/headers";
import type { ExecuteGraphQLInput, ExecuteGraphQLResult, GraphQLVariables } from "../../shared/lib/types";
import { executeGraphQLHTTP } from "../../shared/utils/execute-graphql-http";

export default defineNuxtPlugin(() => {
  const { public: { graphql: { ssrForwardHeaders } } } = useRuntimeConfig();

  function getHeaders(): HeadersInput {
    const headers: HeadersInput = {};
    if (!import.meta.server) {
      return headers;
    }
    const reqHeaders = useRequestHeaders();
    for (const key of ssrForwardHeaders) {
      const lowerKey = key.toLowerCase();
      const value = reqHeaders[lowerKey];
      headers[lowerKey] = value ?? null;
    }
    return headers;
  }

  async function executeGraphQL<TResult = unknown, TVariables extends GraphQLVariables = GraphQLVariables>(
    { query, variables, operationName }: ExecuteGraphQLInput<TVariables>,
  ): Promise<ExecuteGraphQLResult<TResult>> {
    return await executeGraphQLHTTP<TResult, TVariables>({ query, variables, operationName }, {
      endpoint: `/api/graphql`,
      headers: getHeaders(),
    });
  }

  return { provide: { executeGraphQL } };
});

type ExecuteGraphQL = <
  TResult = unknown,
  TVariables extends GraphQLVariables = GraphQLVariables,
>(
  input: ExecuteGraphQLInput<TVariables>,
) => Promise<ExecuteGraphQLResult<TResult>>;

declare module "#app/nuxt" {
  interface NuxtApp {
    $executeGraphQL: ExecuteGraphQL;
  }
}

declare module "#app" {
  interface NuxtApp {
    $executeGraphQL: ExecuteGraphQL;
  }
}
