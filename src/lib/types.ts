// ─────────────────────────────────────────────────────────────
// App types template
// ─────────────────────────────────────────────────────────────

export function renderAppTypesTemplate() {
  return `
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
`.trim();
}

// ─────────────────────────────────────────────────────────────
// Server types template
// ─────────────────────────────────────────────────────────────

export function renderServerTypesTemplate() {
  return `
declare module "h3" {
  interface H3EventContext {
    _graphqlInFlightRequestsMap?: Map<string, Promise<unknown>>;
  }
}

export {};
`.trim();
}

// ─────────────────────────────────────────────────────────────
// Shared types template
// ─────────────────────────────────────────────────────────────

export function renderSharedTypesTemplate() {
  return `
import type { DocumentNode } from "graphql";
import type { CacheConfig } from "nuxt-graphql/runtime/shared/lib/cache-config";

declare global {
  type GraphQLCacheConfig = {
    policy: "no-cache" | "cache-first" | "network-first" | "swr";
    ttl?: number;
    keyPrefix: string;
    keyVersion: string | number;
  };;
}

declare module "nuxt/schema" {
  interface PublicRuntimeConfig {
    graphql: {
      cacheConfig: GraphQLCacheConfig;
      ssrForwardHeaders: string[];
    };
  }
}

export { };

`.trim();
}
