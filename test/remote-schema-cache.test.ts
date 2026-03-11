import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  readRemoteSchemaSDLCache,
  writeRemoteSchemaSDLCache,
} from "../src/lib/schema";

describe("remote schema cache", () => {
  it("persists and reads remote schema SDL", async () => {
    const cacheDir = await mkdtemp(join(tmpdir(), "nuxt-graphql-cache-"));

    await writeRemoteSchemaSDLCache(
      {
        cacheDir,
        endpoint: "https://example.com/graphql",
        headers: { authorization: "Bearer token", "x-tenant": "acme" },
      },
      "type Query { hello: String }",
    );

    const cachedSDL = await readRemoteSchemaSDLCache({
      cacheDir,
      endpoint: "https://example.com/graphql",
      headers: { "x-tenant": "acme", authorization: "Bearer token" },
    });

    expect(cachedSDL).toBe("type Query { hello: String }");
  });
});

