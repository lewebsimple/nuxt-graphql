import type { GraphQLContext } from "#graphql/context";
import { executor, schema } from "#graphql/schema";
import { type ExecutionResult } from "graphql";
import { createYoga, type Plugin } from "graphql-yoga";

// Singleton instance of the GraphQL Yoga server.
let yoga: ReturnType<typeof createYoga<GraphQLContext>> | null = null;

/**
 * Envelop plugin that replaces yoga's `execute` with a direct call to the
 * remote executor. Active only in passthrough mode (single remote subschema,
 * no local schema). Yoga still parses + validates the incoming operation
 * against the schema; only the execution phase is short-circuited.
 */
function passthroughPlugin(): Plugin<GraphQLContext> {
  return {
    onExecute({ setExecuteFn }) {
      setExecuteFn(async ({ document, variableValues, operationName, contextValue }) => {
        return (await executor!({
          document,
          variables: variableValues ?? undefined,
          operationName: operationName ?? undefined,
          context: contextValue,
        })) as ExecutionResult;
      });
    },
  };
}

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
      plugins: executor ? [passthroughPlugin()] : [],
    });
    if (!yoga) {
      throw new Error("Failed to create Yoga instance");
    }
  }
  return yoga;
}
