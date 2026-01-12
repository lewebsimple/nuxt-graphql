import type { H3Event } from "h3";
import type { DocumentNode } from "graphql";
import { execute } from "graphql";
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
// @ts-expect-error Types available at runtime
import { getGraphQLContext } from "#graphql/context";
// @ts-expect-error Types available at runtime
import { schema } from "#graphql/schema";
import { normalizeGraphQLError } from "../../shared/lib/graphql-error";

export interface ExecuteServerGraphQLOptions {
  // Optional HTTP headers overrides
  headers?: HeadersInit;
}

// Build GraphQL context with optional headers overrides
async function buildContextWithHeaders(event: H3Event, headers?: HeadersInit): Promise<unknown> {
  if (!headers) {
    return getGraphQLContext(event);
  }

  const headerOverrides = Object.fromEntries(new Headers(headers).entries());
  if (Object.keys(headerOverrides).length === 0) {
    return getGraphQLContext(event);
  }

  const req = event.node.req;
  const originalHeaders = req.headers;
  req.headers = { ...originalHeaders, ...headerOverrides };
  try {
    return await getGraphQLContext(event);
  }
  finally {
    req.headers = originalHeaders;
  }
}

// Execute GraphQL operation on the server
export async function executeServerGraphQL<
  TResult = unknown,
  TVariables extends Record<string, unknown> = Record<string, unknown>,
>(
  event: H3Event,
  document: TypedDocumentNode<TResult, TVariables> | DocumentNode,
  variables?: TVariables,
  options?: ExecuteServerGraphQLOptions,
): Promise<TResult> {
  const contextValue = await buildContextWithHeaders(event, options?.headers);

  const result = await execute({
    schema,
    document,
    variableValues: variables as unknown as Record<string, unknown> | undefined,
    contextValue,
  });

  if (result.errors?.length) {
    throw normalizeGraphQLError({ errors: result.errors });
  }

  return result.data as TResult;
}
