// Ambient declarations for the virtual modules generated per-app by the module
// (`nitroAliases` in src/module.ts). They only exist inside a consuming Nuxt app,
// so the module's own type-check needs these stand-ins to compile src/runtime/server.
//
// This file is intentionally NOT shipped (package.json `files` only includes dist):
// in a consuming app the real generated modules provide precise types, and an
// ambient declaration would compete with them.

declare module "#graphql/context" {
  import type { H3Event } from "h3";

  export type GraphQLContext = Record<string, unknown>;
  export function createContext(event: H3Event): Promise<GraphQLContext>;
}

declare module "#graphql/schema" {
  import type { GraphQLSchema } from "graphql";

  export function getSchema(): GraphQLSchema;
  export const executor:
    | ((request: {
        document: unknown;
        variables?: unknown;
        operationName?: string;
        context?: unknown;
      }) => Promise<unknown>)
    | undefined;
}
