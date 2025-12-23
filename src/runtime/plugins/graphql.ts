import { GraphQLClient } from "graphql-request";
import { createClient, type Client as SSEClient } from "graphql-sse";
import { defineNuxtPlugin, useRequestHeaders, useRequestURL, useRuntimeConfig } from "#imports";
import { wrapError } from "../utils/graphql-error";

export default defineNuxtPlugin((nuxtApp) => {
  const { public: { graphql: { endpoint, headers: staticHeaders } } } = useRuntimeConfig();
  const { origin } = useRequestURL();
  const url = `${origin}${endpoint}`;

  // GraphQL HTTP client
  const getClient = (): GraphQLClient => {
    const headers: Record<string, string> = { ...staticHeaders };

    // Forward SSR headers
    if (import.meta.server) {
      const ssrHeaders = useRequestHeaders(["cookie", "authorization"]);
      Object.assign(headers, ssrHeaders);
    }

    // Create fresh client with current headers
    const client = new GraphQLClient(url, {
      headers,
      responseMiddleware: (response) => {
        if (response instanceof Error) {
          nuxtApp.callHook("graphql:error", wrapError(response));
        }
      },
    });

    return client;
  };

  // GraphQL SSE client
  let sseClient: SSEClient | null = null;
  const getSSEClient = (): SSEClient => {
    if (import.meta.server) {
      throw new Error("SSE subscriptions are not available on the server");
    }
    if (!sseClient) {
      sseClient = createClient({ url, headers: staticHeaders });
    }
    return sseClient;
  };

  return {
    provide: {
      graphql: getClient,
      graphqlSSE: getSSEClient,
    },
  };
});
