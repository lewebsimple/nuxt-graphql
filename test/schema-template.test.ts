import { describe, expect, it } from "vitest";

import { getRemoteSchemaTemplate, getSchemaTemplate } from "../src/lib/schema";

describe("schema template generation", () => {
  it("returns a dummy schema when no schema is configured", () => {
    const template = getSchemaTemplate({
      localPaths: [],
      remotePaths: [],
    });

    expect(template).toContain(`buildSchema("type Query { _empty: String }")`);
    expect(template).toContain(`export const executor = undefined;`);
  });

  it("exports a single local schema directly", () => {
    const template = getSchemaTemplate({
      localPaths: ["/abs/server/graphql/schema.ts"],
      remotePaths: [],
    });

    expect(template).not.toContain(`extendSchemaWithZodDirectives`);
    expect(template).toContain(`export const schema = localSchema0;`);
    expect(template).toContain(`export const executor = undefined;`);
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
      `subschemas: [mergeSchemas({ schemas: [localSchema0, localSchema1] }), remoteSchema0], mergeTypes: false`,
    );
    expect(template).toContain(`remoteSchema0`);
    expect(template).toContain(`export const executor = undefined;`);
  });

  it("auto-detects passthrough mode for a single remote subschema", () => {
    const template = getSchemaTemplate({
      localPaths: [],
      remotePaths: ["./schemas/remote-0"],
    });

    // No stitch / wrap / merge — pure re-export of the subschema's schema
    // and executor so yoga and executeSchemaOperation can forward directly.
    expect(template).not.toContain(`stitchSchemas`);
    expect(template).not.toContain(`wrapSchema`);
    expect(template).not.toContain(`mergeSchemas`);
    expect(template).not.toContain(`extendSchemaWithZodDirectives`);
    expect(template).toContain(`export const schema = remoteSchema0.schema;`);
    expect(template).toContain(`export const executor = remoteSchema0.executor;`);
  });

  it("stitches when a remote subschema is combined with a local schema", () => {
    const template = getSchemaTemplate({
      localPaths: ["/abs/server/graphql/schema.ts"],
      remotePaths: ["./schemas/remote-0"],
    });

    // 1 local + 1 remote is not passthrough — the local schema may carry
    // resolvers that need to run, so we still stitch.
    expect(template).toContain(`import { stitchSchemas } from "@graphql-tools/stitch";`);
    expect(template).toContain(
      `stitchSchemas({ subschemas: [localSchema0, remoteSchema0], mergeTypes: false })`,
    );
    expect(template).toContain(`export const executor = undefined;`);
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
