import { print } from "graphql";

/** GraphQL remote executor request. */
type GraphQLRemoteExecutorRequest = {
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
  context?: unknown;
};

/** Remote executor hook handlers. */
type GraphQLRemoteExecutorHook = {
  /** Called before sending remote request. */
  onRequest?: (request: GraphQLRemoteExecutorRequest, context: unknown) => void | Promise<void>;
  /** Called after receiving a result. */
  onResult?: (result: unknown, context: unknown) => void | Promise<void>;
  /** Called when execution throws. */
  onError?: (error: unknown, context: unknown) => void | Promise<void>;
};

/** Remote executor factory input. */
type RemoteExecutorInput = {
  /** Remote GraphQL endpoint URL. */
  endpoint: string;
  /** Static request headers. */
  headers: Record<string, string>;
  /** Hook handlers. */
  hooks: GraphQLRemoteExecutorHook[];
};

/**
 * Create a remote GraphQL executor bound to an endpoint.
 *
 * @param input Remote executor options.
 * @returns Async executor function.
 */
export function getRemoteExecutor({ endpoint, headers, hooks }: RemoteExecutorInput) {
  return async function execute(request: GraphQLRemoteExecutorRequest) {
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
export function defineRemoteExecutorHooks(
  hooks: GraphQLRemoteExecutorHook,
): GraphQLRemoteExecutorHook {
  return hooks;
}
