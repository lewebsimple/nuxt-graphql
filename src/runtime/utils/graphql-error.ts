import type { GraphQLError } from "graphql";

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
 * @param error Generic error
 *
 * @returns Wrapped GraphQLClientError
 */
export function wrapError(error: unknown): GraphQLClientError {
  if (error instanceof GraphQLClientError) {
    return error;
  }

  // ClientError (graphql-request)
  if (error && typeof error === "object" && "response" in error) {
    const clientError = error as {
      message: string;
      response?: { errors?: GraphQLError[] };
    };
    return new GraphQLClientError(clientError.message, clientError.response?.errors);
  }

  // Object with errors array (useGraphQLSubscription)
  if (error && typeof error === "object" && "errors" in error) {
    const { errors } = error as { errors: GraphQLError[] };
    const message = errors.map((e) => e.message).join(", ");
    return new GraphQLClientError(message, errors);
  }

  // Generic error
  const message = error instanceof Error ? error.message : String(error);
  return new GraphQLClientError(message);
}
