// ─────────────────────────────────────────────────────────────
// App types template
// ─────────────────────────────────────────────────────────────

export function getAppTypesTemplate() {
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

export function getServerTypesTemplate() {
  return `
import type { ExecutionRequest, ExecutionResult } from "@graphql-tools/utils";

declare module "h3" {
  interface H3EventContext {
    _graphqlInFlightRequestsMap?: Map<string, Promise<unknown>>;
  }
}

declare module "#graphql/runtime/remote-executor" {
  export type CreateRemoteExecutorInput = {
    endpoint: string;
    headers: HeadersInput;
    hooks: GraphQLRemoteExecHooks[];
  };

  export function createRemoteExecutor(options: {
    endpoint: string;
    headers: Record<string, string>;
    hooks: GraphQLRemoteExecHooks[];
  }): Executor;
}

export {};
`.trim();
}

// ─────────────────────────────────────────────────────────────
// Shared types template
// ─────────────────────────────────────────────────────────────

export function getSharedTypesTemplate() {
  return `
import type { DocumentNode } from "graphql";

declare global {
  type GraphQLCacheConfig = {
    policy: "no-cache" | "cache-first" | "network-first" | "swr";
    ttl?: number;
    keyPrefix: string;
    keyVersion: string | number;
  };

  export type HeadersInput = Record<string, string | null>;
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
