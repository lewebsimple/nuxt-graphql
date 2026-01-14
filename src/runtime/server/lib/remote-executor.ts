import { parse, print, getOperationAST } from "graphql";
import type { Executor } from "@graphql-tools/utils";
// @ts-expect-error Types available at runtime
import type { GraphQLContext } from "#graphql/context";
import { normalizeGraphQLError } from "../../shared/lib/graphql-error";

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

export interface CreateRemoteExecutorOptions {
  url: string;
  remoteName: string;
  headers?: HeadersInit;
  middleware?: RemoteExecMiddlewareHandler;
}

// Build a GraphQL Tools executor for a remote schema.
// Hooks run in this order:
// 1) onRequest before the fetch (headers are mutable).
// 2) onResponse after an OK response, before JSON parsing (uses a cloned Response).
// 3) onError on non-2xx responses, GraphQL errors in the payload, JSON parse errors, or network failures.
export function createRemoteExecutor(options: CreateRemoteExecutorOptions): Executor {
  const { url, remoteName, headers = {}, middleware } = options;
  const { onRequest, onResponse, onError } = middleware ?? {};

  let executionDepth = 0;

  return async ({ document, variables, context, operationName }) => {
    executionDepth++;
    const parsedDocument = typeof document === "string" ? parse(document) : document;
    const op = getOperationAST(parsedDocument, operationName);
    const resolvedOperationName = op?.name?.value ?? operationName ?? "anonymous";
    const query = typeof document === "string" ? document : print(document);
    const graphQLContext = context as unknown as GraphQLContext;
    const requestHeaders = new Headers({ "Content-Type": "application/json", ...headers });
    const fetchOptions = {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify({ query, variables, operationName: resolvedOperationName }),
    } satisfies RequestInit;

    if (onRequest && executionDepth === 1) {
      await onRequest({
        remoteName,
        operationName: resolvedOperationName,
        context: graphQLContext,
        fetchOptions: { headers: requestHeaders },
      });
    }

    try {
      const response = await fetch(url, fetchOptions);
      const safeResponse = response.clone(); // allow middleware to read body/headers without consuming the main response

      if (!response.ok) {
        const statusError = normalizeGraphQLError(new Error(`Remote ${remoteName} responded with status ${response.status}`));
        if (onError) {
          await onError({ remoteName, operationName: resolvedOperationName, context: graphQLContext, error: statusError, response: safeResponse });
        }
        throw statusError;
      }

      if (onResponse && executionDepth === 1) {
        await onResponse({ remoteName, operationName: resolvedOperationName, context: graphQLContext, response: safeResponse });
      }

      try {
        const json = await response.json();
        if (json && typeof json === "object" && Array.isArray((json as { errors?: unknown }).errors)) {
          const normalized = normalizeGraphQLError({ errors: (json as { errors: unknown }).errors });
          if (onError) {
            await onError({ remoteName, operationName: resolvedOperationName, context: graphQLContext, error: normalized, response: safeResponse });
          }
          throw normalized;
        }
        return json;
      }
      catch (error) {
        const normalized = normalizeGraphQLError(error);
        if (onError) {
          await onError({ remoteName, operationName: resolvedOperationName, context: graphQLContext, error: normalized, response: safeResponse });
        }
        throw normalized;
      }
    }
    catch (error) {
      const normalized = normalizeGraphQLError(error);
      if (onError) {
        await onError({ remoteName, operationName: resolvedOperationName, context: graphQLContext, error: normalized });
      }
      throw normalized;
    }
    finally {
      executionDepth--;
    }
  };
}
