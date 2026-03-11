import { describe, expect, it } from "vitest";

import { getRemoteSchemaServerTemplate, getSchemaServerTemplate } from "../src/lib/schema";

describe("schema template generation", () => {
  it("returns a dummy schema when no schema is configured", () => {
    const template = getSchemaServerTemplate({
      localSchemaPaths: [],
      remoteSchemaPaths: [],
    });

    expect(template).toContain(`buildSchema("type Query { _empty: String }")`);
  });

  it("exports a single local schema directly", () => {
    const template = getSchemaServerTemplate({
      localSchemaPaths: ["/abs/server/graphql/schema.ts"],
      remoteSchemaPaths: [],
    });

    expect(template).toContain(`export const schema = localSchema0;`);
    expect(template).not.toContain(`stitchSchemas`);
  });

  it("stitches local and remote schemas", () => {
    const template = getSchemaServerTemplate({
      localSchemaPaths: ["/abs/server/graphql/schema-a.ts", "/abs/server/graphql/schema-b.ts"],
      remoteSchemaPaths: ["./schemas/remote-2"],
    });

    expect(template).toContain(`import { stitchSchemas } from "@graphql-tools/stitch";`);
    expect(template).toContain(`subschemas: [localSchema0, remoteSchema0]`);
    expect(template).toContain(`remoteSchema0`);
  });

  it("stitches a single remote schema", () => {
    const template = getSchemaServerTemplate({
      localSchemaPaths: [],
      remoteSchemaPaths: ["./schemas/remote-0"],
    });

    expect(template).toContain(`import { stitchSchemas } from "@graphql-tools/stitch";`);
    expect(template).toContain(`subschemas: [remoteSchema0]`);
  });

  it("builds a remote subschema config without stitching", () => {
    const template = getRemoteSchemaServerTemplate({
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
