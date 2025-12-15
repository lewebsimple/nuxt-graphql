import { createYoga } from "graphql-yoga";
import { defineEventHandler, toWebRequest, sendWebResponse } from "h3";
import { schema } from "#graphql/schema";
import { createContext } from "#graphql/context";

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
  const request = toWebRequest(event);
  const context = await createContext(event);
  const response = await getYoga().handleRequest(request, context);
  return sendWebResponse(event, response);
});
