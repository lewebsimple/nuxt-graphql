import { createYoga } from "graphql-yoga";
import { defineEventHandler, toWebRequest, sendWebResponse, createError } from "h3";
import { schema } from "#graphql/schema";
import { createContext } from "#graphql/context";
import { useLogger } from "@nuxt/kit";

let yoga = null;

function getYoga() {
  if (!yoga) {
    yoga = createYoga({
      schema,
      graphqlEndpoint: "{{endpoint}}",
      fetchAPI: globalThis,
      graphiql: process.env.NODE_ENV !== "production",
    });
  }
  return yoga;
}

export default defineEventHandler(async (event) => {
  const logger = useLogger();
  try {
    const request = toWebRequest(event);
    const context = await createContext(event);
    const response = await getYoga().handleRequest(request, context);
    return sendWebResponse(event, response);
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("GraphQL Server Error:", message);
    throw createError({ statusCode: 500, message: "GraphQL server error" });
  }
});
