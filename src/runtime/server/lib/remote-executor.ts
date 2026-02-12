import { print } from "graphql";
import type { ExecutionRequest, ExecutionResult } from "@graphql-tools/utils";
import type { GraphQLContext } from "#graphql/context";
import { mergeHeaders, type HeadersInput } from "../../shared/lib/headers";
import type { GraphQLVariables } from "../../shared/lib/types";

type GraphQLExecutionRequest = ExecutionRequest<GraphQLVariables, GraphQLContext> & { extensions?: { headers?: HeadersInput } };
type GraphQLExecutionResult<TData = unknown> = ExecutionResult<TData> & { extensions?: { headers?: HeadersInput } };

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

      const responseHeaders: HeadersInput = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      result.extensions = {
        ...(result.extensions && typeof result.extensions === "object" ? result.extensions : {}),
        headers: responseHeaders,
      };

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
