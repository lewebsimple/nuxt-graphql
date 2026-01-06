import type { GraphQLError } from "graphql";

// Custom error class for GraphQL client errors
export class GraphQLClientError extends Error {
  readonly errors: GraphQLError[];

  constructor(message: string, errors: GraphQLError[] = []) {
    super(message);
    this.name = "GraphQLClientError";
    this.errors = errors;
  }
}

/**
 * Wrap a generic error into a GraphQLClientError
 *
 * @param error Generic error from various sources
 * @returns Wrapped GraphQLClientError
 */
export function wrapError(error: unknown): GraphQLClientError {
  if (error instanceof GraphQLClientError) {
    return error;
  }

  // Handle ClientError from graphql-request
  if (error && typeof error === "object" && "response" in error) {
    const clientError = error as {
      message: string;
      response?: { errors?: GraphQLError[] };
    };
    return new GraphQLClientError(clientError.message, clientError.response?.errors);
  }

  // Handle errors from useGraphQLSubscription
  if (error && typeof error === "object" && "errors" in error) {
    const { errors } = error as { errors: GraphQLError[] };
    const message = errors.map((e) => e.message).join(", ");
    return new GraphQLClientError(message, errors);
  }

  // Handle generic errors
  const message = error instanceof Error ? error.message : String(error);
  return new GraphQLClientError(message);
}
