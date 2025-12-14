import type { GraphQLClient } from "graphql-request";

declare module "#app" {
  interface NuxtApp {
    $graphql: GraphQLClient;
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
