import type { GraphQLSchema } from "graphql";
import type { SubschemaConfig } from "@graphql-tools/delegate";

/**
 * Wrap a GraphQL schema or subschema config for module consumption.
 *
 * @param {{ schema: GraphQLSchema | SubschemaConfig }} options Schema wrapper input.
 * @param options.schema Local schema or subschema config.
 * @returns Wrapper object containing the schema.
 */
export function defineGraphQLSchema({ schema }: { schema: GraphQLSchema | SubschemaConfig }) {
  return { schema };
}
