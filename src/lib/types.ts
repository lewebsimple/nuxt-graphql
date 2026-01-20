/**
 * Render the global TypeScript declarations for virtual GraphQL modules.
 *
 * @returns TypeScript declaration source.
 */
export function renderTypesTemplate() {
  return `// Nuxt GraphQL types
declare module "#graphql/context" {
  export { createContext } from "#build/graphql/context";
  export type { GraphQLContext } from "#build/graphql/context";
}

declare module "#graphql/operations" {
  export * from "#build/graphql/operations";
}

declare module "#graphql/fragments" {
  export * from "#build/graphql/fragments";
}

declare module "#graphql/registry" {
  import type { DocumentNode } from "graphql";
  export type { OperationName, QueryName, MutationName, SubscriptionName, VariablesOf, ResultOf } from "#build/graphql/registry";
  export const registry: Readonly<Record<OperationName, { readonly document: DocumentNode; }>>;
}

declare module "#graphql/schema" {
  export { schema } from "#build/graphql/schema";
}`;
}
