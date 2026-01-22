import { createSchema } from "graphql-yoga";

/**
 * Default hello-world schema for development scaffolding.
 */
export const schema = createSchema({
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
