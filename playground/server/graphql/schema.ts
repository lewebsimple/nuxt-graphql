import { createSchema } from "graphql-yoga";

export const schema = createSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      hello(name: String): String!
    }
    type Mutation {
      ping: String!
    }
  `,
  resolvers: {
    Query: {
      hello: (_parent, { name }) => `Hello ${name || "world"}!!`,
    },
    Mutation: {
      ping: () => "pong",
    },
  },
});
