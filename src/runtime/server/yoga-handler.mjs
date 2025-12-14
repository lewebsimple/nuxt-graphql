import { createYoga } from "graphql-yoga";
import { defineEventHandler, toWebRequest, sendWebResponse } from "h3";
import { schema } from "#graphql/schema";
import { createContext } from "#graphql/context";

const yoga = createYoga({
  schema,
  graphqlEndpoint: "{{endpoint}}",
});

export default defineEventHandler(async (event) => {
  const context = await createContext(event);
  const request = toWebRequest(event);
  const response = await yoga.handleRequest(request, context);
  return sendWebResponse(event, response);
});
