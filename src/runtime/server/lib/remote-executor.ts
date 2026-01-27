import { print } from "graphql";
import type { ExecutionRequest, ExecutionResult } from "@graphql-tools/utils";
import { mergeHeaders, type HeadersInput } from "../../shared/lib/headers";

type GraphQLExecutionRequest = ExecutionRequest & { extensions?: { headers?: HeadersInput } };
type GraphQLExecutionResult<TData = unknown> = ExecutionResult<TData>;

export type GraphQLRemoteExecHooks<TData = unknown> = {
  onRequest?: (request: GraphQLExecutionRequest) => void | Promise<void>;
  onResult?: (result: GraphQLExecutionResult<TData>) => void | Promise<void>;
  onError?: (error: unknown) => void | Promise<void>;
};

export type RemoteExecutorInput = {
  endpoint: string;
  headers: HeadersInput;
  hooks: GraphQLRemoteExecHooks[];
};

export function getRemoteExecutor<TData = unknown>({ endpoint, headers, hooks }: RemoteExecutorInput) {
  return async function execute(request: GraphQLExecutionRequest): Promise<GraphQLExecutionResult<TData>> {
    try {
      for (const hook of hooks) {
        await hook.onRequest?.(request);
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...mergeHeaders(headers, request?.extensions?.headers || {}),
        },
        body: JSON.stringify({ query: print(request.document), variables: request.variables }),
      });

      if (!response.ok) {
        throw new Error(`GraphQL HTTP ${response.status}`);
      }

      const result = (await response.json()) as GraphQLExecutionResult<TData>;

      for (const hook of hooks) {
        await hook.onResult?.(result);
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
