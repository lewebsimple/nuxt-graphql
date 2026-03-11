import type { H3Event } from "h3";

/**
 * GraphQL context factory function.
 *
 * @param event Current H3 event.
 * @returns Context object or promise resolving to one.
 */
export type GraphQLContextFactory<TContext extends Record<string, unknown>> = (
  event: H3Event,
) => TContext | Promise<TContext>;

/**
 * Define a typed GraphQL context factory.
 *
 * @param createContext Context factory implementation.
 * @returns Unchanged context factory.
 */
export function defineGraphQLContext<TContext extends Record<string, unknown>>(
  createContext: GraphQLContextFactory<TContext>,
) {
  return createContext;
}
