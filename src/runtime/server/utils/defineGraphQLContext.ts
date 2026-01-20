import type { H3Event } from "h3";

type GraphQLContextFactory<TContext extends Record<string, unknown>> = (event: H3Event) => TContext | Promise<TContext>;

/**
 * Define a GraphQL context factory with proper typing.
 *
 * @param factory Context factory function.
 * @returns The same factory, typed for inference.
 */
export function defineGraphQLContext<TContext extends Record<string, unknown>>(factory: GraphQLContextFactory<TContext>): GraphQLContextFactory<TContext> {
  return factory;
}
