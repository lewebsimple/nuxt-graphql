import { defineNuxtPlugin, useRequestHeaders, useRuntimeConfig } from "#app";

import { pickHeaders } from "../../shared/lib/headers";
import {
  executeHttpOperation,
  type ExecuteGraphQLInput,
  type ExecuteGraphQLResult,
} from "../../shared/utils/execute";
import type { OperationName } from "../../shared/utils/registry";

/**
 * Nuxt plugin that provides a GraphQL operation executor.
 *
 * @returns Nuxt plugin with GraphQL operation executor.
 */
export default defineNuxtPlugin(() => {
  const { ssrForwardHeaders } = useRuntimeConfig().public.graphql;

  async function executeOperation<TName extends OperationName>(input: ExecuteGraphQLInput<TName>) {
    return executeHttpOperation(input, {
      endpoint: "/api/graphql",
      headers: import.meta.server ? pickHeaders(useRequestHeaders(), ssrForwardHeaders) : {},
    });
  }

  return { provide: { executeOperation } };
});

type ExecuteGraphQL = <TName extends OperationName>(
  input: ExecuteGraphQLInput<TName>,
) => Promise<ExecuteGraphQLResult<TName>>;

declare module "#app/nuxt" {
  interface NuxtApp {
    $executeOperation: ExecuteGraphQL;
  }
}

declare module "#app" {
  interface NuxtApp {
    $executeOperation: ExecuteGraphQL;
  }
}
