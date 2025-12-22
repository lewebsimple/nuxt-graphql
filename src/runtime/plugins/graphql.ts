import { GraphQLClient } from "graphql-request";
import { createClient, type Client as SSEClient } from "graphql-sse";
import { defineNuxtPlugin, useRequestHeaders, useRequestURL, useRuntimeConfig } from "#imports";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const { origin } = useRequestURL();
  const endpoint = `${origin}${config.public.graphql.endpoint}`;

  let client: GraphQLClient | null = null;
  const getClient = (): GraphQLClient => {
    if (!client) {
      client = new GraphQLClient(endpoint);
    }
    if (import.meta.server) {
      const headers = useRequestHeaders(["cookie", "authorization"]);
      client.setHeaders(headers);
    }
    return client;
  };

  let sseClient: SSEClient | null = null;
  const getSSEClient = (): SSEClient => {
    if (import.meta.server) {
      throw new Error("SSE subscriptions are not available on the server");
    }
    if (!sseClient) {
      sseClient = createClient({ url: endpoint });
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
