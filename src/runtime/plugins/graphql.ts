import { GraphQLClient } from "graphql-request";
import { createClient, type Client as SSEClient } from "graphql-sse";
import { defineNuxtPlugin, useRequestHeaders, useRequestURL, useRuntimeConfig } from "#imports";

export default defineNuxtPlugin((nuxtApp) => {
  const { public: { graphql: { endpoint, headers: staticHeaders } } } = useRuntimeConfig();
  const { origin } = useRequestURL();
  const url = `${origin}${endpoint}`;

  // GraphQL HTTP client
  let client: GraphQLClient | null = null;
  const getClient = (): GraphQLClient => {
    if (!client) {
      client = new GraphQLClient(url, {
        headers: staticHeaders,
        requestMiddleware: async (request) => {
          const headers: Record<string, string> = {};
          await nuxtApp.callHook("graphql:headers", headers);
          return {
            ...request,
            headers: { ...request.headers, ...headers },
          };
        },
      });
    }
    if (import.meta.server) {
      const headers = useRequestHeaders(["cookie", "authorization"]);
      client.setHeaders(headers);
    }
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
