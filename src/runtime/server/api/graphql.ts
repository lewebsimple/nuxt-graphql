import { createError, defineEventHandler, sendWebResponse, toWebRequest } from "h3";
import { createContext } from "#graphql/context";
import { getYogaInstance } from "../lib/yoga";

/**
 * GraphQL Yoga HTTP endpoint handler.
 *
 * @param event H3 event for the incoming request.
 * @returns Web response from Yoga.
 */
export default defineEventHandler(async (event) => {
  try {
    const request = toWebRequest(event);
    const context = await createContext(event);
    const yoga = getYogaInstance();
    const response = await yoga.handleRequest(request, context);
    return sendWebResponse(event, response);
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("GraphQL server error:", message);
    throw createError({ statusCode: 500, message: "GraphQL server error (see server logs for details)." });
  }
});
