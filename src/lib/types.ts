export function renderAppTypesTemplate() {
  return `// Nuxt GraphQL types (app)
import type { GraphQLClient } from "graphql-request";
import type { Client as SSEClient } from "graphql-sse";

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

export {};
`;
}

export function renderServerTypesTemplate() {
  return `// Nuxt GraphQL types (server)
import type { GraphQLSchema } from "graphql";

declare module "#graphql/context" {
  export type { GraphQLContext };
}

declare module "#graphql/schema" {
  export const schema: GraphQLSchema;
}

declare module "h3" {
  interface H3EventContext {
    _graphqlInFlightRequestsMap?: Map<string, Promise<unknown>>;
  }
}

export {};
`;
}

export function renderSharedTypesTemplate() {
  return `// Nuxt GraphQL types (shared)
import type { DocumentNode } from "graphql";
import type { CacheConfig } from "nuxt-graphql/runtime/shared/lib/cache-config";

declare module "nuxt/schema" {
  interface PublicRuntimeConfig {
    graphql: {
      cacheConfig?: CacheConfig;
      ssrForwardHeaders: string[];
    };
  }
}

export {};
`;
}
