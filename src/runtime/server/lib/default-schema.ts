import { createSchema } from "graphql-yoga";
import { defineGraphQLSchema } from "./schemas";

/**
 * Default hello-world schema for development scaffolding.
 */
const schema = createSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      hello(name: String): String!
    }
  `,
  resolvers: {
    Query: {
      hello: (_parent, { name }) => `Hello ${name || "world"}!`,
    },
  },
});

/**
 * Export the default schema definition wrapper.
 */
export default defineGraphQLSchema({ schema });
