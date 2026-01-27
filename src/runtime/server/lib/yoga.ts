import { createYoga } from "graphql-yoga";
import { schema } from "#graphql/schema";

let yoga: ReturnType<typeof createYoga> | null = null;

/**
 * Get or create the singleton GraphQL Yoga instance.
 *
 * @returns GraphQL Yoga server instance.
 */
export function getYogaInstance() {
  if (!yoga) {
    yoga = createYoga({
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
