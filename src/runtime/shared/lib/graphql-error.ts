import type { GraphQLError } from "graphql";

// Custom error class for GraphQL errors
export class NormalizedGraphQLError extends Error {
  readonly errors: GraphQLError[];

  constructor(message: string, errors: GraphQLError[] = []) {
    super(message);
    this.name = "NormalizedGraphQLError";
    this.errors = errors;
  }
}

/**
 * Normalize a generic error into a NormalizedGraphQLError
 *
 * @param error Generic error from various sources
 * @returns Normalized GraphQL error
 */
export function normalizeGraphQLError(error: unknown): NormalizedGraphQLError {
  if (error instanceof NormalizedGraphQLError) {
    return error;
  }

  // Handle GraphQLError
  if (error && typeof error === "object" && "message" in error && "locations" in error) {
    const graphQLError = error as GraphQLError;
    return new NormalizedGraphQLError(graphQLError.message, [graphQLError]);
  }

  // Handle ClientError from graphql-request
  if (error && typeof error === "object" && "response" in error) {
    const clientError = error as {
      message: string;
      response?: { errors?: GraphQLError[] };
    };
    return new NormalizedGraphQLError(clientError.message, clientError.response?.errors);
  }

  // Handle errors from useGraphQLSubscription
  if (error && typeof error === "object" && "errors" in error) {
    const { errors } = error as { errors: GraphQLError[] };
    const message = errors.map((e) => e.message).join(", ");
    return new NormalizedGraphQLError(message, errors);
  }

  // Handle generic errors
  const message = error instanceof Error ? error.message : String(error);
  return new NormalizedGraphQLError(message);
}

declare module "#app" {
  interface RuntimeNuxtHooks {
    "graphql:error": (error: NormalizedGraphQLError) => void;
  }
}
