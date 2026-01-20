import type { ExecutionRequest, Executor } from "@graphql-tools/utils";
import { buildHTTPExecutor } from "@graphql-tools/executor-http";
import { mergeHeaders, type HeadersInput } from "../../shared/lib/headers";
import type { GraphQLRemoteExecHooks } from "../utils/defineRemoteExecutorHooks";

// Create a remote executor for a given remote schema definition
type CreateRemoteExecutorInput = {
  url: string;
  headers?: HeadersInput;
  hooks: GraphQLRemoteExecHooks[];
};

/**
 * Create an HTTP executor for a remote GraphQL schema.
 *
 * @param {CreateRemoteExecutorInput} options Remote executor configuration.
 * @param options.url Remote GraphQL endpoint.
 * @param options.headers Static headers for all requests.
 * @param options.hooks Per-operation hooks.
 * @returns Executor function for GraphQL Tools.
 */
export function createRemoteExecutor({ url, headers, hooks }: CreateRemoteExecutorInput): Executor {
  // Merge static and request-provided headers.
  function getHeaders(request?: ExecutionRequest): Record<string, string> {
    const extHeaders: HeadersInput = request?.extensions?.headers || {};
    const mergedHeaders = mergeHeaders(headers, extHeaders);
    return Object.fromEntries(mergedHeaders.entries());
  }

  const executor = buildHTTPExecutor({
    endpoint: url,
    headers: (request) => getHeaders(request),
    fetch: globalThis.fetch,
  });

  return async (request: ExecutionRequest) => {
    try {
      for (const hook of hooks) {
        await hook.onRequest?.(request);
      }
      const result = await executor(request);
      // HTTP executor never returns streams, but stay future-proof
      if (!(Symbol.asyncIterator in result)) {
        for (const hook of hooks) {
          await hook.onResult?.(result);
        }
      }
      return result;
    }
    catch (error) {
      for (const hook of hooks) {
        await hook.onError?.(error);
      }
      throw error;
    }
  };
}
