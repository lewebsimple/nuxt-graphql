import type { H3Event } from "h3";
import { getRequestHeaders, getRequestURL } from "h3";
import { GraphQLClient } from "graphql-request";
import { useRuntimeConfig } from "#imports";

/**
 * Get or create a server-side GraphQL client for an H3 event
 *
 * @param event H3 event
 * @returns GraphQL client instance
 */
export function getGraphQLClient(event: H3Event): GraphQLClient {
  // Return cached client if available
  if (event.context.__nuxtGraphQLClient) {
    return event.context.__nuxtGraphQLClient;
  }

  // Create new client with request headers
  const { public: { graphql: { endpoint } } } = useRuntimeConfig();
  const { origin } = getRequestURL(event);
  const url = `${origin}${endpoint}`;
  const headers = getRequestHeaders(event) as Record<string, string>;

  event.context.__nuxtGraphQLClient = new GraphQLClient(url, { headers });

  return event.context.__nuxtGraphQLClient;
}

// Extend H3 event context type
declare module "h3" {
  interface H3EventContext {
    __nuxtGraphQLClient?: GraphQLClient;
  }
}
