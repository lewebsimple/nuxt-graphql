import type { GraphQLClient } from "graphql-request";
import type { Client as SSEClient } from "graphql-sse";
import type { GraphQLClientError } from "../utils/graphql-error";

declare module "#app" {
  interface NuxtApp {
    $graphql: () => GraphQLClient;
    $graphqlSSE: () => SSEClient;
  }
  interface RuntimeNuxtHooks {
    "graphql:headers": (headers: Record<string, string>) => void | Promise<void>;
    "graphql:error": (error: GraphQLClientError) => void;
  }
}

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
