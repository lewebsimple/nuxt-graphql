import { defineNuxtPlugin, useRequestURL } from "#app";
import { createClient, type Client as SSEClient } from "graphql-sse";

export default defineNuxtPlugin((_nuxtApp) => {
  const { origin } = useRequestURL();

  // Create GraphQL SSE client on-demand
  let sseClient: SSEClient | undefined;
  function getGraphQLSSEClient(): SSEClient {
    // Prevent server-side usage
    if (import.meta.server) {
      throw new Error("GraphQL SSE client is not available on the server");
    }

    if (sseClient) return sseClient;
    return sseClient = createClient({ url: `${origin}/api/graphql` });
  };

  return { provide: { getGraphQLSSEClient } };
});
