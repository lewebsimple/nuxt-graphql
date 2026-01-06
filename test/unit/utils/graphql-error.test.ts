import { describe, it, expect } from "vitest";
import { GraphQLClientError, wrapError } from "../../../src/runtime/app/utils/graphql-error";
import type { GraphQLError } from "graphql/error";

describe("GraphQLClientError", () => {
  it("should create error with message", () => {
    const error = new GraphQLClientError("Test error");

    expect(error.message).toBe("Test error");
    expect(error.name).toBe("GraphQLClientError");
    expect(error.errors).toEqual([]);
  });

  it("should create error with GraphQL errors", () => {
    const graphqlErrors = [
      { message: "Field not found", extensions: {} } as GraphQLError,
    ];
    const error = new GraphQLClientError("GraphQL error", graphqlErrors);

    expect(error.message).toBe("GraphQL error");
    expect(error.errors).toBe(graphqlErrors);
  });
});

describe("wrapError", () => {
  it("should return GraphQLClientError as-is", () => {
    const original = new GraphQLClientError("Test error");
    const wrapped = wrapError(original);

    expect(wrapped).toBe(original);
  });

  it("should wrap ClientError from graphql-request", () => {
    const clientError = {
      message: "Request failed",
      response: {
        errors: [{ message: "Field error" }],
      },
    };

    const wrapped = wrapError(clientError);

    expect(wrapped).toBeInstanceOf(GraphQLClientError);
    expect(wrapped.message).toBe("Request failed");
    expect(wrapped.errors).toEqual(clientError.response.errors);
  });

  it("should wrap error with errors array from subscription", () => {
    const subscriptionError = {
      errors: [
        { message: "Subscription error 1" },
        { message: "Subscription error 2" },
      ],
    };

    const wrapped = wrapError(subscriptionError);

    expect(wrapped).toBeInstanceOf(GraphQLClientError);
    expect(wrapped.message).toBe("Subscription error 1, Subscription error 2");
    expect(wrapped.errors).toEqual(subscriptionError.errors);
  });

  it("should wrap generic Error", () => {
    const error = new Error("Generic error");
    const wrapped = wrapError(error);

    expect(wrapped).toBeInstanceOf(GraphQLClientError);
    expect(wrapped.message).toBe("Generic error");
    expect(wrapped.errors).toEqual([]);
  });

  it("should wrap string error", () => {
    const wrapped = wrapError("String error");

    expect(wrapped).toBeInstanceOf(GraphQLClientError);
    expect(wrapped.message).toBe("String error");
    expect(wrapped.errors).toEqual([]);
  });

  it("should wrap unknown error types", () => {
    const wrapped = wrapError({ someProperty: "value" });

    expect(wrapped).toBeInstanceOf(GraphQLClientError);
    expect(wrapped.message).toBe("[object Object]");
  });

  it("should wrap null/undefined", () => {
    const wrappedNull = wrapError(null);
    const wrappedUndefined = wrapError(undefined);

    expect(wrappedNull).toBeInstanceOf(GraphQLClientError);
    expect(wrappedUndefined).toBeInstanceOf(GraphQLClientError);
  });
});
