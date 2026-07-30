import { GraphQLError } from "graphql";
import { describe, expect, it } from "vitest";

import { NormalizedError, normalizeError } from "../src/runtime/shared/utils/error";

describe("normalizeError", () => {
  it("passes through NormalizedError instances", () => {
    const original = new NormalizedError({ message: "original" });
    expect(normalizeError(original)).toBe(original);
  });

  it("aggregates a GraphQL execution result", () => {
    const error = normalizeError({
      errors: [{ message: "first", extensions: { code: "FORBIDDEN" } }, { message: "second" }],
    });

    expect(error.message).toBe("first\nsecond");
    expect(error.errors).toHaveLength(2);
    expect(error.code).toBe("FORBIDDEN");
  });

  it("aggregates a bare array of GraphQL errors", () => {
    // `executeHttpOperation` and the subscription composable pass `result.errors` directly.
    const error = normalizeError([{ message: "denied", extensions: { code: "UNAUTHORIZED" } }]);

    expect(error.message).toBe("denied");
    expect(error.errors).toHaveLength(1);
    expect(error.code).toBe("UNAUTHORIZED");
  });

  it("normalizes a thrown GraphQLError instance", () => {
    const error = normalizeError(new GraphQLError("boom", { extensions: { code: "BAD_REQUEST" } }));

    expect(error.message).toBe("boom");
    expect(error.errors).toHaveLength(1);
    expect(error.code).toBe("BAD_REQUEST");
  });

  it("classifies fetch failures as network errors", () => {
    // Every Error instance has a `message`, so this must not be swallowed by the
    // GraphQL-error branch.
    const error = normalizeError(new TypeError("Failed to fetch"));

    expect(error.code).toBe("NETWORK_ERROR");
    expect(error.message).toBe("Failed to fetch");
  });

  it("classifies FetchError instances as network errors with their status", () => {
    class FetchError extends Error {
      status = 503;
      constructor(message: string) {
        super(message);
        this.name = "FetchError";
      }
    }

    const error = normalizeError(new FetchError("[POST] /api/graphql: 503"));

    expect(error.code).toBe("NETWORK_ERROR");
    expect(error.status).toBe(503);
  });

  it("normalizes standard errors without a code", () => {
    const error = normalizeError(new Error("plain"));

    expect(error.message).toBe("plain");
    expect(error.code).toBeUndefined();
    expect(error.errors).toHaveLength(0);
  });

  it("normalizes strings and plain values", () => {
    expect(normalizeError("oops").message).toBe("oops");
    expect(normalizeError({ message: "shaped" }).message).toBe("shaped");
    expect(normalizeError({ weird: true }).code).toBe("INTERNAL_ERROR");
  });
});
