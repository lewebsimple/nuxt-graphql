import type { GraphQLContext } from "#graphql/context";

type Awaitable<T> = T | Promise<T>;

export type RemoteMiddlewareContext = {
  remoteName: string;
  operationName?: string | null;
  context: GraphQLContext;
};

export type RemoteMiddlewareRequestContext = RemoteMiddlewareContext & {
  fetchOptions: RequestInit;
};

export type RemoteMiddlewareResponseContext = RemoteMiddlewareRequestContext & {
  response: Response;
};

export type RemoteMiddleware = {
  onRequest?: (context: RemoteMiddlewareRequestContext) => Awaitable<RequestInit | undefined>;
  onResponse?: (context: RemoteMiddlewareResponseContext) => Awaitable<void>;
};
