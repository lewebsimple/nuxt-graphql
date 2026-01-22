import type { H3Event } from "h3";

export type GraphQLContextFactory<TContext extends Record<string, unknown>> = (event: H3Event) => TContext | Promise<TContext>;

/**
 * Define a GraphQL context factory with proper typing.
 */
export function defineGraphQLContext<TContext extends Record<string, unknown>>(createContext: GraphQLContextFactory<TContext>): GraphQLContextFactory<TContext> {
  return createContext;
}
