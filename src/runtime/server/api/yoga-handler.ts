import { defineEventHandler, toWebRequest, sendWebResponse, createError } from "h3";
import { createYoga } from "graphql-yoga";
// @ts-expect-error Types available at runtime
import { getGraphQLContext } from "#graphql/context";
// @ts-expect-error Types available at runtime
import { yogaMiddlewareHandler } from "#graphql/yoga-middleware";
// @ts-expect-error Types available at runtime
import { schema } from "#graphql/schema";
import type { YogaMiddlewareHandler } from "../lib/define-yoga-middleware";

// Create Yoga instance on-demand
let yoga: ReturnType<typeof createYoga> | null = null;
function getYogaInstance() {
  if (!yoga) {
    yoga = createYoga({
      schema,
      graphqlEndpoint: "/api/graphql",
      fetchAPI: globalThis,
      graphiql: process.env.NODE_ENV !== "production",
      // @ts-expect-error subscriptions type available at runtime
      subscriptions: { protocol: "SSE" },
    });
  }
  return yoga;
}

export default defineEventHandler(async (event) => {
  try {
    const request = toWebRequest(event);
    const context = await getGraphQLContext(event);
    const { onRequest, onResponse } = <YogaMiddlewareHandler>(yogaMiddlewareHandler ?? {});

    // Execute Yoga middleware onRequest hook
    if (onRequest) {
      await onRequest({ event, context, request });
    }

    const response = await getYogaInstance().handleRequest(request, context);

    // Execute Yoga middleware onResponse hook
    let finalResponse = response;
    const setResponse = (next: Response) => {
      finalResponse = next;
    };
    if (onResponse) {
      await onResponse({ event, context, request, response, setResponse });
    }

    return sendWebResponse(event, finalResponse);
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("GraphQL Server Error:", message);
    throw createError({ statusCode: 500, message: "GraphQL server error (see server logs for details)" });
  }
});
