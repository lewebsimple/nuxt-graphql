import { defineEventHandler, toWebRequest, sendWebResponse, createError } from "h3";
import { getYoga } from "../lib/create-yoga";

export default defineEventHandler(async (event) => {
  try {
    const request = toWebRequest(event);
    const context = {};
    const response = await getYoga().handleRequest(request, context);
    return sendWebResponse(event, response);
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("GraphQL Server Error:", message);
    throw createError({ statusCode: 500, message: "GraphQL server error" });
  }
});
