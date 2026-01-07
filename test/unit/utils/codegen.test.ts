import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { analyzeDocuments, formatDefinitions, writeRegistryModule, type DocumentAnalysis } from "../../../src/helpers/codegen";

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "codegen-test-"));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

const writeDoc = (name: string, content: string) => {
  const path = join(tmpDir, name);
  writeFileSync(path, content, "utf-8");
  return path;
};

describe("analyzeGraphQLDocuments", () => {
  it("should analyze query operations", () => {
    const docs = [writeDoc("GetUser.gql", `query GetUser($id: ID!) { user(id: $id) { id name } }`)];

    const result = analyzeDocuments(docs);

    expect(result.operationsByType.query).toHaveLength(1);
    expect(result.operationsByType.query[0]).toEqual({
      kind: "operation",
      type: "query",
      name: "GetUser",
    });
  });

  it("should analyze mutation operations", () => {
    const docs = [writeDoc("CreateUser.gql", `mutation CreateUser($name: String!) { createUser(name: $name) { id } }`)];

    const result = analyzeDocuments(docs);

    expect(result.operationsByType.mutation).toHaveLength(1);
    expect(result.operationsByType.mutation[0]!.name).toBe("CreateUser");
  });

  it("should analyze subscription operations", () => {
    const docs = [writeDoc("OnUserCreated.gql", `subscription OnUserCreated { userCreated { id name } }`)];

    const result = analyzeDocuments(docs);

    expect(result.operationsByType.subscription).toHaveLength(1);
    expect(result.operationsByType.subscription[0]!.name).toBe("OnUserCreated");
  });

  it("should analyze fragment definitions", () => {
    const docs = [writeDoc("UserFragment.gql", `fragment UserFields on User { id name email }`)];

    const result = analyzeDocuments(docs);

    expect(result.byFile.get(docs[0]!)).toEqual([
      { kind: "fragment", name: "UserFields" },
    ]);
  });

  it("should throw on unnamed operations", () => {
    const docs = [writeDoc("Unnamed.gql", `query { users { id } }`)];

    expect(() => analyzeDocuments(docs)).toThrow("Unnamed query operation");
  });

  it("should throw on duplicate operation names", () => {
    const docs = [
      writeDoc("GetUser1.gql", `query GetUser { user { id } }`),
      writeDoc("GetUser2.gql", `query GetUser { user { name } }`),
    ];

    expect(() => analyzeDocuments(docs)).toThrow("Duplicate query operation name");
  });

  it("should throw on duplicate fragment names", () => {
    const docs = [
      writeDoc("Fragment1.gql", `fragment UserFields on User { id }`),
      writeDoc("Fragment2.gql", `fragment UserFields on User { name }`),
    ];

    expect(() => analyzeDocuments(docs)).toThrow("Duplicate fragment name");
  });

  it("should handle multiple operations in different files", () => {
    const docs = [
      writeDoc("Queries.gql", `
          query GetUser { user { id } }
          query GetUsers { users { id } }
        `),
      writeDoc("Mutations.gql", `mutation CreateUser { createUser { id } }`),
    ];

    const result = analyzeDocuments(docs);

    expect(result.operationsByType.query).toHaveLength(2);
    expect(result.operationsByType.mutation).toHaveLength(1);
  });
});

describe("formatDefinitions", () => {
  it("should return empty string for no definitions", () => {
    const result = formatDefinitions([]);
    expect(result).toBe("");
  });

  it("should format operations with colors", () => {
    const defs = [
      { kind: "operation" as const, type: "query" as const, name: "GetUser" },
      { kind: "operation" as const, type: "mutation" as const, name: "CreateUser" },
      { kind: "fragment" as const, name: "UserFields" },
    ];

    const result = formatDefinitions(defs);

    // Check that it contains the operation names
    expect(result).toContain("GetUser");
    expect(result).toContain("CreateUser");
    expect(result).toContain("UserFields");
  });
});

describe("writeRegistryModule", () => {
  const readRegistry = (analysis: DocumentAnalysis["operationsByType"]) => {
    const registryPath = join(tmpDir, "registry.ts");
    writeRegistryModule(registryPath, { byFile: new Map(), operationsByType: analysis });
    return readFileSync(registryPath, "utf-8");
  };

  it("should generate empty registry for no operations", () => {
    const analysis: DocumentAnalysis["operationsByType"] = {
      query: [],
      mutation: [],
      subscription: [],
    };

    const result = readRegistry(analysis);

    expect(result).toContain("export const queries = {} as const");
    expect(result).toContain("export const mutations = {} as const");
    expect(result).toContain("export const subscriptions = {} as const");
  });

  it("should generate registry with queries", () => {
    const analysis: DocumentAnalysis["operationsByType"] = {
      query: [
        { kind: "operation", type: "query", name: "GetUser" },
        { kind: "operation", type: "query", name: "GetUsers" },
      ],
      mutation: [],
      subscription: [],
    };

    const result = readRegistry(analysis);

    expect(result).toContain("GetUser: ops.GetUserDocument");
    expect(result).toContain("GetUsers: ops.GetUsersDocument");
    expect(result).toContain("export type QueryName = keyof typeof queries");
  });

  it("should generate registry with all operation types", () => {
    const analysis: DocumentAnalysis["operationsByType"] = {
      query: [{ kind: "operation", type: "query", name: "GetUser" }],
      mutation: [{ kind: "operation", type: "mutation", name: "CreateUser" }],
      subscription: [{ kind: "operation", type: "subscription", name: "OnUserCreated" }],
    };

    const result = readRegistry(analysis);

    expect(result).toContain("GetUser: ops.GetUserDocument");
    expect(result).toContain("CreateUser: ops.CreateUserDocument");
    expect(result).toContain("OnUserCreated: ops.OnUserCreatedDocument");
  });

  it("should include required imports and type helpers", () => {
    const analysis: DocumentAnalysis["operationsByType"] = {
      query: [],
      mutation: [],
      subscription: [],
    };

    const result = readRegistry(analysis);

    expect(result).toContain("import type { TypedDocumentNode }");
    expect(result).toContain("import * as ops from \"#graphql/operations\"");
    expect(result).toContain("type ResultOf<T>");
    expect(result).toContain("type VariablesOf<T>");
  });
});

describe("loadSchemaSdl", () => {
  it("should load SDL from a schema-exporting module", async () => {
    const schemaPath = writeDoc("schema.ts", `export const schema = {} as any;`);

    vi.resetModules();
    vi.doMock("graphql", () => ({
      printSchema: () => "type Query { ping: Boolean }",
      lexicographicSortSchema: (s: unknown) => s,
    }));

    const { loadSchemaSdl } = await import("../../../src/helpers/codegen");
    const sdl = await loadSchemaSdl(schemaPath);

    vi.resetModules();
    vi.doUnmock("graphql");

    expect(sdl).toContain("type Query");
    expect(sdl).toContain("ping");
  });

  it("should throw when module lacks schema export", async () => {
    const badSchemaPath = writeDoc("bad-schema.ts", `export const notSchema = 1;`);

    vi.resetModules();
    vi.doUnmock("graphql");

    await expect(async () => {
      const { loadSchemaSdl } = await import("../../../src/helpers/codegen");
      await loadSchemaSdl(badSchemaPath);
    }).rejects.toThrow("must export a 'schema' variable");
    vi.resetModules();
  });
});
