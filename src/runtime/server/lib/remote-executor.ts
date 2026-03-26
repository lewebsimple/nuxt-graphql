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

/** Remote executor hook handlers. */
export type GraphQLRemoteExecutorHook<TContext extends Record<string, unknown> = GraphQLContext> = {
  /** Called before sending remote request. */
  onRequest?: (
    request: GraphQLRemoteExecutorRequest<TContext>,
    context: TContext | undefined,
  ) => void | Promise<void>;
  /** Called after receiving a result. */
  onResult?: (result: unknown, context: TContext | undefined) => void | Promise<void>;
  /** Called when execution throws. */
  onError?: (error: unknown, context: TContext | undefined) => void | Promise<void>;
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

      if (!response.ok) {
        throw new Error(`GraphQL HTTP ${response.status}`);
      }

      const result = (await response.json()) as unknown;

      for (const hook of hooks) {
        await hook.onResult?.(result, context);
      }

      return result;
    } catch (error) {
      for (const hook of hooks) {
        await hook.onError?.(error, context);
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
