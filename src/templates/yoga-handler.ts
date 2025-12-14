import { createYoga } from "graphql-yoga";
import { defineEventHandler, toWebRequest, sendWebResponse } from "h3";
/** @ts-expect-error - No type declarations in module context */
import { schema } from "#graphql/schema";
/** @ts-expect-error - No type declarations in module context */
import { createContext } from "#graphql/context";

let yoga: ReturnType<typeof createYoga> | null = null;

function getYoga() {
  if (!yoga) {
    yoga = createYoga({
      schema,
      graphqlEndpoint: "{{endpoint}}",
      fetchAPI: globalThis,
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
