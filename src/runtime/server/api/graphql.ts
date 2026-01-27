import { defineEventHandler, sendWebResponse, toWebRequest } from "h3";
import { createContext } from "#graphql/context";
import { getYogaInstance } from "../lib/yoga";

export default defineEventHandler(async (event) => {
  try {
    const yoga = getYogaInstance();
    const request = toWebRequest(event);
    const context = await createContext(event);
    const response = await yoga.handleRequest(request, context);
    return sendWebResponse(event, response);
  }
  catch (error) {
    console.error("GraphQL Yoga error:", error);
    throw error;
  }
});
