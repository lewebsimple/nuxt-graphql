import { defineEventHandler, toWebRequest, sendWebResponse, createError } from "h3";
import { logger } from "../lib/logger";
import { getYoga } from "../graphql/create-yoga";
import { createContext } from "#graphql/context";

export default defineEventHandler(async (event) => {
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
