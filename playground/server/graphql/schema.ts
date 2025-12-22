import { createSchema } from "graphql-yoga";
import type { GraphQLContext } from "./context";

export const schema = createSchema<GraphQLContext>({
  typeDefs: /* GraphQL */ `
      type Query {
        hello: String!
      }
      type Mutation {
        ping: String!
      }
      type Subscription {
        time: String!
      }
    `,
  resolvers: {
    Query: {
      hello: () => "Hello from @lewebsimple/nuxt-graphql playground!",
    },
    Mutation: {
      ping: () => "pong",
    },
    Subscription: {
      time: {
        subscribe: async function* () {
          while (true) {
            yield { time: new Date().toISOString() };
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        },
      },
    },
  },
});
