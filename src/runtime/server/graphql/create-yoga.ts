import { createYoga } from "graphql-yoga";
import { schema } from "#graphql/schema";
import { createContext } from "#graphql/context";
import { GRAPHQL_ENDPOINT } from "./constants";

let yoga: ReturnType<typeof createYoga> | null = null;

export function getYoga() {
  if (!yoga) {
    yoga = createYoga({
      schema,
      graphqlEndpoint: GRAPHQL_ENDPOINT,
      fetchAPI: globalThis,
      graphiql: process.env.NODE_ENV !== "production",
      // @ts-expect-error Subscriptions type missing in module context
      subscriptions: { protocol: "SSE" },
    });
  }

  return yoga;
}
