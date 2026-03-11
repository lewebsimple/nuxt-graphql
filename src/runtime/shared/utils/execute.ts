import { print } from "graphql";

import { mergeHeaders, type HeadersInput } from "../lib/headers";

import { normalizeError, type NormalizedError } from "./error";
import {
  getOperationDocument,
  parseOperationResult,
  parseOperationVariables,
  type OperationName,
  type ResultOf,
  type VariablesInputOf,
} from "./registry";

// ─────────────────────────────────────────────────────────────
// GraphQL execution types
// ─────────────────────────────────────────────────────────────

/** Typed GraphQL operation input payload. */
export type ExecuteGraphQLInput<TName extends OperationName> = {
  /** GraphQL operation name to execute. */
  operationName: TName;
  /** Variables provided to the operation. */
  variables: VariablesInputOf<TName>;
};

/** Typed GraphQL operation result payload. */
export type ExecuteGraphQLResult<TName extends OperationName> =
  | { data: ResultOf<TName>; error: null }
  | { data: null; error: NormalizedError };

// ─────────────────────────────────────────────────────────────
// GraphQL HTTP execution
// ─────────────────────────────────────────────────────────────

/** HTTP transport options for GraphQL execution. */
export type ExecuteHttpOperationOptions = {
  /** Target GraphQL endpoint URL. */
  endpoint: string;
  /** Additional request headers merged into defaults. */
  headers?: HeadersInput;
};

type GraphQLHttpResponse = { data?: unknown; errors?: unknown };

/**
 * Execute a typed GraphQL operation over HTTP.
 *
 * @param input Operation input payload.
 * @param options HTTP execution options.
 * @returns Typed GraphQL data or normalized error.
 */
export async function executeHttpOperation<TName extends OperationName>(
  { operationName, variables }: ExecuteGraphQLInput<TName>,
  { endpoint, headers }: ExecuteHttpOperationOptions,
): Promise<ExecuteGraphQLResult<TName>> {
  try {
    const document = getOperationDocument(operationName);
    const parsedVariables = parseOperationVariables(operationName, variables);

    const result = await $fetch<GraphQLHttpResponse>(endpoint, {
      method: "POST",
      headers: mergeHeaders({ "content-type": "application/json" }, headers),
      body: JSON.stringify({ query: print(document), variables: parsedVariables, operationName }),
    });

    if (result.errors) {
      return { data: null, error: normalizeError(result.errors) };
    }

    const data = parseOperationResult(operationName, result.data);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: normalizeError(error) };
  }
}
