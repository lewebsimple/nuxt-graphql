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

type ServerTemplateInput = {
  contextModules: string[];
};

export function renderServerTypesTemplate({ contextModules }: ServerTemplateInput) {
  const contextImports = contextModules.map((module, index) => `import createContext${index} from ${JSON.stringify(module)};`);
  const contextTypes = ["{}", ...contextModules.map((_, index) => `Awaited<ReturnType<typeof createContext${index}>>`)];

  return `
import type { GraphQLSchema } from "graphql";
import type { H3Event } from "h3";
${contextImports.join("\n")}

declare module "#graphql/context" {
  export type GraphQLContext = ${contextTypes.join(" & ")};
  export async function createContext(event: H3Event): Promise<GraphQLContext>;
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
      cacheConfig?: GraphQLCacheConfig;
      ssrForwardHeaders: string[];
    };
  }
}

export { };

`.trim();
}
