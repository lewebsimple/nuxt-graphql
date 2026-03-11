import type { GraphQLError } from "graphql";

// ─────────────────────────────────────────────────────────────
// Error codes
// ─────────────────────────────────────────────────────────────

/** Supported GraphQL error codes. */
export interface GraphQLErrorCodeMap {
  /** Fallback internal error code. */
  INTERNAL_ERROR: true;
  /** Network transport error code. */
  NETWORK_ERROR: true;
  /** Client request validation error code. */
  BAD_REQUEST: true;
  /** Authentication required error code. */
  UNAUTHORIZED: true;
  /** Authorization failure error code. */
  FORBIDDEN: true;
}

/** GraphQL error code union. */
export type GraphQLErrorCode = keyof GraphQLErrorCodeMap;

/**
 * Extract a typed error code from a GraphQL error.
 *
 * @param error GraphQL error.
 * @returns Error code when present.
 */
function extractErrorCode(error?: GraphQLError): GraphQLErrorCode | undefined {
  const code = error?.extensions?.code;
  return typeof code === "string" ? (code as GraphQLErrorCode) : undefined;
}

// ─────────────────────────────────────────────────────────────
// Type guards
// ─────────────────────────────────────────────────────────────

/**
 * Check whether a value is a non-null object.
 *
 * @param value Candidate value.
 * @returns True when value is an object.
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Check whether a value looks like a GraphQL error.
 *
 * @param value Candidate value.
 * @returns True when value is GraphQLError-like.
 */
function isGraphQLError(value: unknown): value is GraphQLError {
  return isObject(value) && "message" in value;
}

/**
 * Check whether a value is an array of GraphQL errors.
 *
 * @param value Candidate value.
 * @returns True when value is a GraphQLError array.
 */
function isGraphQLErrorArray(value: unknown): value is GraphQLError[] {
  return Array.isArray(value) && value.every(isGraphQLError);
}

/**
 * Check whether a value is a GraphQL execution result with errors.
 *
 * @param value Candidate value.
 * @returns True when value contains GraphQL errors.
 */
function isGraphQLExecutionResult(value: unknown): value is { errors: GraphQLError[] } {
  return (
    isObject(value) &&
    "errors" in value &&
    isGraphQLErrorArray((value as { errors: unknown }).errors)
  );
}

// ─────────────────────────────────────────────────────────────
// Error normalization
// ─────────────────────────────────────────────────────────────

/** Normalized application error. */
export class NormalizedError extends Error {
  /** Original GraphQL errors. */
  readonly errors: readonly GraphQLError[];
  /** Normalized error code. */
  readonly code?: GraphQLErrorCode;
  /** Optional HTTP status. */
  readonly status?: number;

  constructor(input: {
    message: string;
    errors?: readonly GraphQLError[];
    code?: GraphQLErrorCode;
    status?: number;
    cause?: unknown;
  }) {
    super(input.message, { cause: input.cause });
    this.name = "NormalizedError";
    this.errors = input.errors ?? [];
    this.code = input.code;
    this.status = input.status;
  }
}

/**
 * Normalize unknown thrown values to `NormalizedError`.
 *
 * @param error Unknown error value.
 * @returns Normalized error object.
 */
export function normalizeError(error: unknown): NormalizedError {
  if (error instanceof NormalizedError) {
    return error;
  }

  // GraphQL execution result { errors: [...] }
  if (isGraphQLExecutionResult(error)) {
    const { errors } = error;

    return new NormalizedError({
      message: errors.map((e) => e.message).join("\n"),
      errors,
      code: extractErrorCode(errors[0]),
    });
  }

  // single GraphQL error
  if (isGraphQLError(error)) {
    const gqlError = error as GraphQLError;

    return new NormalizedError({
      message: gqlError.message,
      errors: [gqlError],
      code: extractErrorCode(gqlError),
    });
  }

  // Fetch / network error
  if (error instanceof TypeError || (error instanceof Error && error.name === "FetchError")) {
    return new NormalizedError({
      message: error.message,
      code: "NETWORK_ERROR",
    });
  }

  // Standard Error
  if (error instanceof Error) {
    return new NormalizedError({
      message: error.message,
    });
  }

  // Fallback
  return new NormalizedError({
    message: typeof error === "string" ? error : JSON.stringify(error),
    code: "INTERNAL_ERROR",
  });
}
