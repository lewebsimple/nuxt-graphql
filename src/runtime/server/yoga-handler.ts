import { createYoga } from "graphql-yoga";
import { defineEventHandler, toWebRequest, sendWebResponse, createError } from "h3";
import { schema } from "#graphql/schema";
import { createContext } from "#graphql/context";
import { logger } from "./lib/logger";

let yoga: ReturnType<typeof createYoga> | null = null;
function getYoga() {
  if (!yoga) {
    yoga = createYoga({
      schema,
      graphqlEndpoint: "/api/graphql",
      fetchAPI: globalThis,
      graphiql: process.env.NODE_ENV !== "production",
      // @ts-expect-error Subscriptions type missing in module context
      subscriptions: { protocol: "SSE" },
    });
  }
  return yoga;
}

export default defineEventHandler(async (event) => {
  try {
    const request = toWebRequest(event);
    const context = await createContext(event);
    const response = await getYoga().handleRequest(request, context);
    return sendWebResponse(event, response);
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("GraphQL server error:", message);
    throw createError({ statusCode: 500, message: "GraphQL server error" });
  }
});
