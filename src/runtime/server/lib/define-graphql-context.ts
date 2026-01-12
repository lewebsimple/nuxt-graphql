import type { H3Event } from "h3";

export type GetGraphQLContextFn<TContext extends Record<string, unknown>> = (event: H3Event) => Promise<TContext> | TContext;

export function defineGraphQLContext<TContext extends Record<string, unknown>>(getGraphQLContext: GetGraphQLContextFn<TContext>) {
  return { getGraphQLContext };
};
