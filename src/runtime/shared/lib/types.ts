import type { DocumentNode } from "graphql";
import type { NormalizedError } from "./error";

// GraphQL execution types
export type GraphQLVariables = Record<string, unknown>;

export type ExecuteGraphQLInput<TVariables extends GraphQLVariables = GraphQLVariables> = {
  query: DocumentNode | string;
  variables?: TVariables;
  operationName?: string;
};

export type ExecuteGraphQLResult<TResult> = { data: TResult; error: null } | { data: null; error: NormalizedError };

// Cache configuration
export type CacheConfig = {
  policy: "no-cache" | "cache-first" | "network-first" | "swr";
  ttl?: number;
  keyPrefix: string;
  keyVersion: string | number;
};

export type IsEmptyObject<T> = [T] extends [never] ? true : T extends object ? keyof T extends never ? true : false : false;

// Public runtime config
declare module "nuxt/schema" {
  interface PublicRuntimeConfig {
    graphql: {
      cacheConfig: CacheConfig;
      ssrForwardHeaders: string[];
    };
  }
}
