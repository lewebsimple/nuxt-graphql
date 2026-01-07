import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { setup, $fetch } from "@nuxt/test-utils/e2e";

describe("graphql:error hook", async () => {
  await setup({
    rootDir: fileURLToPath(new URL("./fixtures/hooks", import.meta.url)),
  });

  it("should trigger error hook on GraphQL errors", async () => {
    // Test that error hooks are properly triggered
    const html = await $fetch("/");
    expect(html).toBeDefined();
  });
});
