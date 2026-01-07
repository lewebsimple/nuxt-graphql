import type { H3Event } from "h3";

type Awaitable<T> = T | Promise<T>;

export type RemoteMiddlewareContext = {
  remoteName: string;
  operationName?: string | null;
  event: H3Event;
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

// Helper for user-defined remote middleware to get type inference
export function defineRemoteMiddleware(middleware: RemoteMiddleware) {
  return middleware;
}
