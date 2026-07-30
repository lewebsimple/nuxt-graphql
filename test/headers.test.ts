import { describe, expect, it } from "vitest";

import { mergeHeaders, pickHeaders } from "../src/runtime/shared/lib/headers";

describe("pickHeaders", () => {
  it("picks single-word and multi-word header names", () => {
    // Multi-word names are the regression: a word-splitting lower-caser turned
    // "x-api-key" into "x api key" and silently dropped the header.
    const incoming = {
      authorization: "Bearer token",
      cookie: "session=abc",
      "x-api-key": "secret",
      "x-forwarded-for": "1.2.3.4",
      accept: "application/json",
    };

    expect(pickHeaders(incoming, ["authorization", "cookie", "x-api-key"])).toEqual({
      authorization: "Bearer token",
      cookie: "session=abc",
      "x-api-key": "secret",
    });
  });

  it("matches case-insensitively on both sides", () => {
    expect(pickHeaders({ "X-Shop-Id": "42" }, ["x-shop-id"])).toEqual({ "X-Shop-Id": "42" });
    expect(pickHeaders({ "x-shop-id": "42" }, ["X-Shop-Id"])).toEqual({ "x-shop-id": "42" });
  });

  it("skips undefined values and unknown names", () => {
    expect(pickHeaders({ authorization: undefined, other: "x" }, ["authorization"])).toEqual({});
  });
});

describe("mergeHeaders", () => {
  it("merges objects with later inputs overriding", () => {
    const merged = mergeHeaders(
      { "content-type": "text/plain" },
      { "Content-Type": "application/json" },
    );
    expect(merged.get("content-type")).toBe("application/json");
  });

  it("deletes null-valued headers", () => {
    const merged = mergeHeaders({ authorization: "Bearer x" }, { authorization: null });
    expect(merged.has("authorization")).toBe(false);
  });
});
