import type { GraphQLContext } from "#graphql/context";
import { print } from "graphql";

/** GraphQL remote executor request. */
export type GraphQLRemoteExecutorRequest<
  TContext extends Record<string, unknown> = GraphQLContext,
> = {
  /** GraphQL document node. */
  document: unknown;
  /** Operation variables. */
  variables?: unknown;
  /** Operation name. */
  operationName?: string;
  /** Additional execution extensions. */
  extensions?: {
    /** Extra HTTP headers for this request. */
    headers?: Record<string, string>;
  };
  /** Execution context. */
  context?: TContext;
};

/** Metadata from the upstream HTTP response. */
export type GraphQLRemoteExecutorResponseMeta = {
  /** Response headers from the upstream endpoint. */
  headers: Headers;
  /** HTTP status code from the upstream endpoint. */
  status: number;
};

/** Remote executor hook handlers. */
export type GraphQLRemoteExecutorHook<TContext extends Record<string, unknown> = GraphQLContext> = {
  /** Called before sending remote request. */
  onRequest?: (
    request: GraphQLRemoteExecutorRequest<TContext>,
    context: TContext | undefined,
  ) => void | Promise<void>;
  /** Called after receiving a result, with the upstream response metadata. */
  onResult?: (
    result: unknown,
    context: TContext | undefined,
    meta: GraphQLRemoteExecutorResponseMeta,
  ) => void | Promise<void>;
  /**
   * Called when execution throws. `meta` is provided when the failure happened
   * after the HTTP response was received (non-2xx, JSON parse error, hook
   * error); it is `undefined` for fetch/network failures.
   */
  onError?: (
    error: unknown,
    context: TContext | undefined,
    meta?: GraphQLRemoteExecutorResponseMeta,
  ) => void | Promise<void>;
};

/** Remote executor factory input. */
type RemoteExecutorInput<TContext extends Record<string, unknown> = GraphQLContext> = {
  /** Remote GraphQL endpoint URL. */
  endpoint: string;
  /** Static request headers. */
  headers: Record<string, string>;
  /** Hook handlers. */
  hooks: GraphQLRemoteExecutorHook<TContext>[];
};

/**
 * Create a remote GraphQL executor bound to an endpoint.
 *
 * @param input Remote executor options.
 * @returns Async executor function.
 */
export function getRemoteExecutor<TContext extends Record<string, unknown> = GraphQLContext>({
  endpoint,
  headers,
  hooks,
}: RemoteExecutorInput<TContext>) {
  return async function execute(request: GraphQLRemoteExecutorRequest<TContext>) {
    const context = request.context;
    let meta: GraphQLRemoteExecutorResponseMeta | undefined;

    try {
      for (const hook of hooks) {
        await hook.onRequest?.(request, context);
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
          ...request.extensions?.headers,
        },
        body: JSON.stringify({
          query: print(request.document as Parameters<typeof print>[0]),
          variables: request.variables,
          operationName: request.operationName,
        }),
      });

      meta = { headers: response.headers, status: response.status };

      if (!response.ok) {
        throw new Error(`GraphQL HTTP ${response.status}`);
      }

      const result = (await response.json()) as unknown;

      for (const hook of hooks) {
        await hook.onResult?.(result, context, meta);
      }

      return result;
    } catch (error) {
      for (const hook of hooks) {
        await hook.onError?.(error, context, meta);
      }
      throw error;
    }
  };
}

/**
 * Define remote executor hooks with proper typing.
 *
 * @param hooks Hooks implementation.
 * @returns The same hooks object.
 */
export function defineRemoteExecutorHooks<
  TContext extends Record<string, unknown> = GraphQLContext,
>(hooks: GraphQLRemoteExecutorHook<TContext>): GraphQLRemoteExecutorHook<TContext> {
  return hooks;
}
