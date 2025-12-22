import type { GraphQLClient } from "graphql-request";
import type { Client as SSEClient } from "graphql-sse";

declare module "#app" {
  interface NuxtApp {
    $graphql: () => GraphQLClient;
    $graphqlSSE: () => SSEClient;
  }
}

declare module "nuxt/schema" {
  interface PublicRuntimeConfig {
    graphql: {
      endpoint: string;
    };
  }
}

export { };
