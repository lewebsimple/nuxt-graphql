import { defineNuxtPlugin, useRequestURL } from "#app";
import { createClient, type Client as SSEClient } from "graphql-sse";

/**
 * Nuxt plugin that provides a GraphQL SSE client (client-only).
 *
 * @returns Nuxt plugin with SSE client provider.
 */
export default defineNuxtPlugin((_nuxtApp) => {
  const { origin } = useRequestURL();

  let sseClient: SSEClient | undefined;
  // Lazily create or reuse the SSE client.
  function getGraphQLSSEClient(): SSEClient {
    if (import.meta.server) {
      throw new Error("GraphQL SSE client is not available on the server");
    }
    if (sseClient) return sseClient;
    return sseClient = createClient({ url: `${origin}/api/graphql` });
  };

  return { provide: { getGraphQLSSEClient } };
});
