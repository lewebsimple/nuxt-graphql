// @ts-expect-error Types available at runtime
import type { GraphQLContext } from "#graphql/context";

export type RemoteExecMiddlewareOnRequestArgs = {
  remoteName: string;
  operationName: string;
  context: GraphQLContext;
  fetchOptions: { headers: Headers };
};

export type RemoteExecMiddlewareOnResponseArgs = {
  remoteName: string;
  operationName: string;
  context: GraphQLContext;
  response: Response;
};

export type RemoteExecMiddlewareOnErrorArgs = {
  remoteName: string;
  operationName: string;
  context: GraphQLContext;
  error: unknown;
  response?: Response;
};

export type RemoteExecMiddlewareHandler = {
  onRequest?: (args: RemoteExecMiddlewareOnRequestArgs) => Promise<void> | void;
  onResponse?: (args: RemoteExecMiddlewareOnResponseArgs) => Promise<void> | void;
  onError?: (args: RemoteExecMiddlewareOnErrorArgs) => Promise<void> | void;
};

// Register per-remote hooks for remote executors: onRequest, onResponse, onError.
export function defineRemoteExecMiddleware(remoteExecMiddlewareHandler: RemoteExecMiddlewareHandler) {
  return { remoteExecMiddlewareHandler };
}
