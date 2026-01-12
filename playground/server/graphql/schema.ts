import { createSchema } from "graphql-yoga";
import type { GraphQLContext } from "#graphql/context";

export const schema = createSchema<GraphQLContext>({
  typeDefs: /* GraphQL */ `
    type Query {
      hello: String!
      currentTime: String!
    }
    type Mutation {
      ping(message: String!): String!
    }
    type Subscription {
      time: String!
    }
  `,
  resolvers: {
    Query: {
      currentTime: () => new Date().toISOString(),
      hello: () => "Hello from @lewebsimple/nuxt-graphql playground!",
    },
    Mutation: {
      ping: (_parent, args) => `pong: ${args.message}`,
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
