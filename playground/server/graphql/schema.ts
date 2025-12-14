import { createSchema } from "graphql-yoga";
import type { GraphQLContext } from "./context";

export const schema = createSchema<GraphQLContext>({
  typeDefs: /* GraphQL */ `
      type Query {
        hello: String!
      }
    `,
  resolvers: {
    Query: {
      hello: () => "Hello from @lewebsimple/nuxt-graphql playground!",
    },
  },
});
