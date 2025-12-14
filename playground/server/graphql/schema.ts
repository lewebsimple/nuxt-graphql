import type { GraphQLContext } from "#graphql/runtime";
import { createSchema } from "graphql-yoga";

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
