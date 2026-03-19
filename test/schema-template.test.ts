import { describe, expect, it } from "vitest";

import { getRemoteSchemaTemplate, getSchemaTemplate } from "../src/lib/schema";

describe("schema template generation", () => {
  it("returns a dummy schema when no schema is configured", () => {
    const template = getSchemaTemplate({
      localPaths: [],
      remotePaths: [],
    });

    expect(template).toContain(`buildSchema("type Query { _empty: String }")`);
  });

  it("exports a single local schema directly", () => {
    const template = getSchemaTemplate({
      localPaths: ["/abs/server/graphql/schema.ts"],
      remotePaths: [],
    });

    expect(template).toContain(`export const schema = localSchema0;`);
    expect(template).not.toContain(`stitchSchemas`);
  });

  it("stitches local and remote schemas", () => {
    const template = getSchemaTemplate({
      localPaths: ["/abs/server/graphql/schema-a.ts", "/abs/server/graphql/schema-b.ts"],
      remotePaths: ["./schemas/remote-2"],
    });

    expect(template).toContain(`import { stitchSchemas } from "@graphql-tools/stitch";`);
    expect(template).toContain(`import { mergeSchemas } from "@graphql-tools/schema";`);
    expect(template).toContain(`mergeSchemas({ schemas: [localSchema0, localSchema1] })`);
    expect(template).toContain(
      `subschemas: [mergeSchemas({ schemas: [localSchema0, localSchema1] }), remoteSchema0]`,
    );
    expect(template).toContain(`remoteSchema0`);
  });

  it("exports a single remote schema directly", () => {
    const template = getSchemaTemplate({
      localPaths: [],
      remotePaths: ["./schemas/remote-0"],
    });

    expect(template).not.toContain(`stitchSchemas`);
    expect(template).toContain(`export const schema = remoteSchema0;`);
  });

  it("builds a remote subschema config without stitching", () => {
    const template = getRemoteSchemaTemplate({
      endpoint: "https://example.com/graphql",
      headers: { Authorization: "Bearer token" },
      hooks: ["/abs/server/graphql/hook.ts"],
      sdl: "type Query { hello: String }",
    });

    expect(template).toContain(
      `import { getRemoteExecutor } from "#graphql/runtime/remote-executor";`,
    );
    expect(template).toContain(`export const schema = {`);
    expect(template).not.toContain(`stitchSchemas`);
  });
});
