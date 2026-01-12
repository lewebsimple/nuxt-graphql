import type { GraphQLClient } from "graphql-request";
import type { Client as SSEClient } from "graphql-sse";
import type { GraphQLCacheConfig } from "../lib/graphql-cache";

declare global {
  type IsEmptyObject<T> = T extends Record<string, never> ? true : keyof T extends never ? true : false;
}

declare module "h3" {
  interface H3EventContext {
    _graphqlInFlightRequestsMap?: Map<string, Promise<unknown>>;
  }
}

declare module "nuxt/schema" {
  interface PublicRuntimeConfig {
    graphql: {
      cacheConfig: GraphQLCacheConfig;
    };
  }
}

declare module "#app/nuxt" {
  interface NuxtApp {
    $getGraphQLClient: () => GraphQLClient;
    $getGraphQLSSEClient: () => SSEClient;
  }
}

declare module "#app" {
  interface NuxtApp {
    $getGraphQLClient: () => GraphQLClient;
    $getGraphQLSSEClient: () => SSEClient;
  }
}

export { };
