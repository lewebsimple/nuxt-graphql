import { createYoga } from "graphql-yoga";
import type { GraphQLContext } from "#graphql/context";
import { schema } from "#graphql/schema";

let yoga: ReturnType<typeof createYoga<GraphQLContext>> | null = null;

/**
 * Get or create the singleton GraphQL Yoga instance.
 *
 * @returns GraphQL Yoga server instance.
 */
export function getYogaInstance() {
  if (!yoga) {
    yoga = createYoga<GraphQLContext>({
      graphqlEndpoint: "/api/graphql",
      graphiql: import.meta.dev,
      fetchAPI: globalThis,
      schema,
    });
    if (!yoga) {
      throw new Error("Failed to create Yoga instance");
    }
  }
  return yoga;
};
