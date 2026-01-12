import { GraphQLClient } from "graphql-request";
import { defineNuxtPlugin, useRequestEvent, useRequestURL } from "#app";
import { normalizeGraphQLError } from "../../shared/lib/graphql-error";
import { getClientForwardHeaders } from "../../shared/lib/headers";

export default defineNuxtPlugin((nuxtApp) => {
  const { origin } = useRequestURL();
  const event = useRequestEvent();
  const headers = event ? getClientForwardHeaders(event) : undefined;

  // Create GraphQL client instance
  function getGraphQLClient() {
    return new GraphQLClient(`${origin}/api/graphql`, {
      headers,
      responseMiddleware: (response, _request) => {
        // Invoke graphql:error hook on errors
        if (response instanceof Error) {
          nuxtApp.callHook("graphql:error", normalizeGraphQLError(response));
          return;
        }
      },
    });
  }

  return { provide: { getGraphQLClient } };
});
