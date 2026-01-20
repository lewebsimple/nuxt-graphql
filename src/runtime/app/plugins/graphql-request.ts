import { defineNuxtPlugin, useRequestHeaders, useRequestURL, useRuntimeConfig } from "#app";
import { GraphQLClient } from "graphql-request";

/**
 * Nuxt plugin that provides a configured graphql-request client.
 *
 * @returns Nuxt plugin with GraphQL client provider.
 */
export default defineNuxtPlugin(() => {
  const { origin } = useRequestURL();
  const { public: { graphql: { ssrForwardHeaders } } } = useRuntimeConfig();

  // Build SSR-forwarded headers for the GraphQL request.
  function getHeaders() {
    const headers = new Headers();
    if (!import.meta.server) return headers;
    Object.entries(useRequestHeaders()).forEach(([key, value]) => {
      if (value !== undefined && ssrForwardHeaders.includes(key.toLowerCase())) {
        headers.set(key, value);
      }
    });
    return headers;
  }

  // Create a GraphQLClient bound to the Nuxt GraphQL endpoint.
  function getGraphQLClient() {
    return new GraphQLClient(`${origin}/api/graphql`, { headers: getHeaders });
  }

  return { provide: { getGraphQLClient } };
});
