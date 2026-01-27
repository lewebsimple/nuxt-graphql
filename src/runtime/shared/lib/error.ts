import type { GraphQLError } from "graphql";

// ─────────────────────────────────────────────────────────────
// Error codes (typed + extensible)
// ─────────────────────────────────────────────────────────────

export interface GraphQLErrorCodeMap {
  INTERNAL_ERROR: true;
  NETWORK_ERROR: true;
  BAD_REQUEST: true;
  UNAUTHORIZED: true;
  FORBIDDEN: true;
}

type GraphQLErrorCode = keyof GraphQLErrorCodeMap;

// ─────────────────────────────────────────────────────────────
// Normalized error
// ─────────────────────────────────────────────────────────────

/**
 * Unified, transport-agnostic GraphQL error.
 *
 * - `message`  : human-readable summary
 * - `code`     : typed, extensible error code
 * - `errors[]` : underlying GraphQL execution errors (lossless)
 */
export class NormalizedError extends Error {
  readonly errors: readonly GraphQLError[];
  readonly code?: GraphQLErrorCode;

  constructor(input: {
    message: string;
    errors?: readonly GraphQLError[];
    code?: GraphQLErrorCode;
  }) {
    super(input.message);
    this.name = "NormalizedError";
    this.errors = input.errors ?? [];
    this.code = input.code;
  }
}

// ─────────────────────────────────────────────────────────────
// Type guards & helpers
// ─────────────────────────────────────────────────────────────

/**
 * Check if a value looks like a GraphQLError.
 *
 * @param error Unknown error value.
 * @returns True if the value is a GraphQLError-like object.
 */
function isGraphQLError(error: unknown): error is GraphQLError {
  return (
    typeof error === "object"
    && error !== null
    && "message" in error
    && "extensions" in error
  );
}

/**
 * Check if a value is an array of GraphQLErrors.
 *
 * @param error Unknown error value.
 * @returns True if the value is a GraphQLError array.
 */
function isGraphQLErrorArray(error: unknown): error is GraphQLError[] {
  return Array.isArray(error) && error.every(isGraphQLError);
}

/**
 * Extract a typed error code from a GraphQLError.
 *
 * @param error GraphQL error.
 * @returns Parsed error code, if any.
 */
export function extractCode(error?: GraphQLError): GraphQLErrorCode | undefined {
  const code = error?.extensions?.code;
  return typeof code === "string"
    ? (code as GraphQLErrorCode)
    : undefined;
}

// ─────────────────────────────────────────────────────────────
// Normalization
// ─────────────────────────────────────────────────────────────

/**
 * Normalize an unknown error into a NormalizedError.
 *
 * This function is the **only** place where untrusted errors are interpreted.
 *
 * @param error Unknown error value.
 * @returns NormalizedError instance.
 */
export function normalizeError(error: unknown): NormalizedError {
  if (error instanceof NormalizedError) {
    return error;
  }

  // Single GraphQL execution error
  if (isGraphQLError(error)) {
    return new NormalizedError({
      message: error.message,
      errors: [error],
      code: extractCode(error),
    });
  }

  // Subscription / execution-style { errors: GraphQLError[] }
  if (
    typeof error === "object"
    && error !== null
    && "errors" in error
    && isGraphQLErrorArray((error as { errors: unknown }).errors)
  ) {
    const errors = (error as { errors: GraphQLError[] }).errors;
    return new NormalizedError({
      message: errors.map(({ message }) => message).join("\n"),
      errors,
      code: extractCode(errors[0]),
    });
  }

  // Fallback
  return new NormalizedError({
    message: error instanceof Error ? error.message : String(error),
    code: "INTERNAL_ERROR",
  });
}
