import type { H3Event } from "h3";
// @ts-expect-error Types available at runtime
import type { GraphQLContext } from "#graphql/context";

export type YogaMiddlewareRequestArgs = {
  event: H3Event;
  context: GraphQLContext;
  request: Request;
};

export type YogaMiddlewareResponseArgs = {
  event: H3Event;
  context: GraphQLContext;
  request: Request;
  response: Response;
  setResponse: (next: Response) => void;
};

export type YogaMiddlewareHandler = {
  onRequest?: (args: YogaMiddlewareRequestArgs) => Promise<void> | void;
  onResponse?: (args: YogaMiddlewareResponseArgs) => Promise<void> | void;
};

// Register Yoga hooks; onResponse can replace the outgoing Response via setResponse.
export function defineYogaMiddleware(yogaMiddlewareHandler: YogaMiddlewareHandler) {
  return { yogaMiddlewareHandler };
}
