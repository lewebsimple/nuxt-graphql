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
 * Check whether a value has a GraphQL-error message shape.
 *
 * Deliberately loose (any object with a string `message`): only used where the surrounding
 * structure — an `errors` array — already disambiguates from plain `Error` instances.
 *
 * @param value Candidate value.
 * @returns True when value carries a string message.
 */
function isGraphQLErrorLike(value: unknown): value is GraphQLError {
  return isObject(value) && typeof value.message === "string";
}

/**
 * Check whether a standalone value is a GraphQL error.
 *
 * Requires a GraphQL-specific marker on top of `message`: every `Error` instance has a
 * `message`, so a message-only check would swallow network and standard errors before
 * their own branches run.
 *
 * @param value Candidate value.
 * @returns True when value is a GraphQL error.
 */
function isGraphQLError(value: unknown): value is GraphQLError {
  return (
    isGraphQLErrorLike(value) &&
    ("extensions" in value || "locations" in value || "path" in value || "nodes" in value)
  );
}

/**
 * Check whether a value is a non-empty array of GraphQL errors.
 *
 * @param value Candidate value.
 * @returns True when value is a GraphQLError array.
 */
function isGraphQLErrorArray(value: unknown): value is GraphQLError[] {
  return Array.isArray(value) && value.length > 0 && value.every(isGraphQLErrorLike);
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

/**
 * Extract an HTTP status code from a fetch-style error.
 *
 * @param error Error instance.
 * @returns HTTP status when present.
 */
function extractStatus(error: Error): number | undefined {
  const candidate = error as Error & { status?: unknown; statusCode?: unknown };
  if (typeof candidate.status === "number") return candidate.status;
  if (typeof candidate.statusCode === "number") return candidate.statusCode;
  return undefined;
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
    return graphQLErrorsToNormalized(error.errors);
  }

  // Bare array of GraphQL errors (e.g. `result.errors` passed directly)
  if (isGraphQLErrorArray(error)) {
    return graphQLErrorsToNormalized(error);
  }

  // Single GraphQL error — thrown `GraphQLError` instances included, which is why this must be
  // checked before the generic `Error` branches (GraphQLError extends Error).
  if (isGraphQLError(error)) {
    return graphQLErrorsToNormalized([error]);
  }

  // Fetch / network error
  if (error instanceof TypeError || (error instanceof Error && error.name === "FetchError")) {
    return new NormalizedError({
      message: error.message,
      code: "NETWORK_ERROR",
      status: extractStatus(error),
      cause: error,
    });
  }

  // Standard Error
  if (error instanceof Error) {
    return new NormalizedError({
      message: error.message,
      cause: error,
    });
  }

  // Plain object with a message
  if (isGraphQLErrorLike(error)) {
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

/**
 * Build a `NormalizedError` from GraphQL errors.
 *
 * @param errors GraphQL errors (non-empty).
 * @returns Normalized error aggregating messages, keeping the original errors.
 */
function graphQLErrorsToNormalized(errors: readonly GraphQLError[]): NormalizedError {
  return new NormalizedError({
    message: errors.map((e) => e.message).join("\n"),
    errors,
    code: extractErrorCode(errors[0]),
  });
}
