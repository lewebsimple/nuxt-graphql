import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildSchema, introspectionFromSchema } from "graphql";
import { writeLocalSchemaModule, writeRemoteSchemaSdl, writeRemoteSchemaModule, writeStitchedSchemaModule } from "../../../src/helpers/schemas";

let tmpDir: string;
const originalFetch = globalThis.fetch;

beforeEach(() => {
  tmpDir = mkdtempSync(join(process.cwd(), "schemas-test-"));
});

afterEach(() => {
  if (originalFetch) {
    globalThis.fetch = originalFetch;
  }
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("writeLocalSchemaModule", () => {
  it("writes a proxy that re-exports schema", () => {
    const schemaPath = join(tmpDir, "schema.ts");
    writeFileSync(schemaPath, "export const schema = 'ok';\n", "utf-8");
    const modulePath = join(tmpDir, "module.ts");

    writeLocalSchemaModule({ localPath: schemaPath, modulePath });

    const content = readFileSync(modulePath, "utf-8");
    expect(content).toMatch(/export \{ schema \} from ".+schema"/);
  });
});

describe("writeRemoteSchemaSdl", () => {
  it("fetches introspection and writes SDL module", async () => {
    const schema = buildSchema("type Query { hello: String }");
    const introspection = introspectionFromSchema(schema);

    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ data: introspection }),
    }) as unknown as typeof fetch;

    const sdlPath = join(tmpDir, "remote.ts");
    await writeRemoteSchemaSdl({ schemaDef: { type: "remote", url: "https://example.com/graphql" }, sdlPath });

    const content = readFileSync(sdlPath, "utf-8");
    expect(content).toContain("export const sdl = /* GraphQL */ `");
    expect(content).toContain("type Query");
  });
});

describe("writeRemoteSchemaModule", () => {
  it("builds executor module referencing cached SDL", () => {
    const modulePath = join(tmpDir, "remote-module.ts");
    const sdlPath = join(tmpDir, "remote-sdl.ts");
    writeFileSync(sdlPath, "export const sdl = 'type Query { hello: String }';", "utf-8");

    writeRemoteSchemaModule({ schemaDef: { type: "remote", url: "https://example.com/graphql", headers: { Authorization: "token" } }, sdlPath, modulePath });

    const content = readFileSync(modulePath, "utf-8");
    expect(content).toContain("https://example.com/graphql");
    expect(content).toContain("Authorization");
    expect(content).toContain("import { sdl } from");
  });
});

describe("writeStitchedSchemaModule", () => {
  it("stitches provided schemas", () => {
    const modulePath = join(tmpDir, "stitched.ts");

    writeStitchedSchemaModule({ schemaNames: ["local", "remote"], modulePath });

    const content = readFileSync(modulePath, "utf-8");
    expect(content).toContain("import { schema as localSchema }");
    expect(content).toContain("import { schema as remoteSchema }");
    expect(content).toContain("stitchSchemas({ subschemas })");
  });
});
