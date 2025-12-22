import type { H3Event } from "h3";
import { getRequestHeaders, getRequestURL } from "h3";
import { GraphQLClient } from "graphql-request";
import { useRuntimeConfig } from "#imports";

/**
 * Create server-side GraphQL client instance for the given H3 event.
 *
 * @param event H3 event
 *
 * @returns GraphQL client instance
 */
export function createGraphQLClient(event: H3Event): GraphQLClient {
  const { public: { graphql: { endpoint } } } = useRuntimeConfig();
  const { origin } = getRequestURL(event);
  const url = `${origin}${endpoint}`;
  const headers = getRequestHeaders(event) as Record<string, string>;
  const client = new GraphQLClient(url, { headers });
  return client;
}
