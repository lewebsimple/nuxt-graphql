import { fileURLToPath } from "node:url";

import { setup, $fetch } from "@nuxt/test-utils/e2e";
import { describe, it, expect } from "vitest";

describe("ssr", async () => {
  await setup({
    rootDir: fileURLToPath(new URL("./fixtures/basic", import.meta.url)),
  });

  it("renders the index page", async () => {
    // Get response to a server-rendered page with `$fetch`.
    const html = await $fetch("/");
    expect(html).toContain("<div>basic</div>");
  });

  it("merges GraphQL context factories in order", async () => {
    const context = await $fetch<Record<string, unknown>>("/api/context");
    expect(context).toEqual({
      requestId: "a",
      fromA: true,
      fromB: true,
      shared: "b",
    });
  });

  it("stitches configured GraphQL schemas", async () => {
    const response = await $fetch<{ data: { fromA: string; fromB: string } }>("/api/graphql", {
      method: "POST",
      body: {
        query: "{ fromA fromB }",
      },
    });

    expect(response).toEqual({
      data: {
        fromA: "a",
        fromB: "b",
      },
    });
  });
});
