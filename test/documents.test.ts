import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";

import { isGraphQLDocumentChange } from "../src/lib/documents";

describe("document watch filtering", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.splice(0).map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
  });

  it("ignores plain vue edits without GraphQL", async () => {
    const dir = await mkdtemp(join(tmpdir(), "nuxt-graphql-documents-"));
    tempDirs.push(dir);

    const file = join(dir, "Page.vue");
    await writeFile(file, `<template><div>Hello</div></template>`);

    await expect(isGraphQLDocumentChange(file, "change")).resolves.toBe(false);
  });

  it("detects plucked GraphQL in code files", async () => {
    const dir = await mkdtemp(join(tmpdir(), "nuxt-graphql-documents-"));
    tempDirs.push(dir);

    const file = join(dir, "query.ts");
    await writeFile(
      file,
      `
      import { gql } from "@apollo/client/core";

      export const query = gql\`
        query HelloWorld {
          hello
        }
      \`;
      `,
    );

    await expect(isGraphQLDocumentChange(file, "change")).resolves.toBe(true);
  });

  it("always rebuilds for graphql file deletes", async () => {
    const file = join(tmpdir(), "DeletedFragment.gql");

    await expect(isGraphQLDocumentChange(file, "unlink")).resolves.toBe(true);
  });

  it("rebuilds for code file deletes to drop stale documents", async () => {
    const file = join(tmpdir(), "DeletedQuery.vue");

    await expect(isGraphQLDocumentChange(file, "unlink")).resolves.toBe(true);
  });
});
