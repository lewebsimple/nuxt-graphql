import type { GraphQLClient } from "graphql-request";
import type { Client as SSEClient } from "graphql-sse";
import type { GraphQLClientError } from "../utils/graphql-error";

// Extend NuxtApp with GraphQL clients
declare module "#app" {
  interface NuxtApp {
    $graphql: () => GraphQLClient;
    $graphqlSSE: () => SSEClient;
  }

  interface RuntimeNuxtHooks {
    "graphql:error": (error: GraphQLClientError) => void;
  }
}

// Extend Nuxt runtime config with GraphQL options
declare module "nuxt/schema" {
  interface PublicRuntimeConfig {
    graphql: {
      endpoint: string;
      headers: Record<string, string>;
      cache: GraphQLCacheConfig;
    };
  }
}

export { };
