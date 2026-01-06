import { describe, it, expect } from "vitest";
import { analyzeDocuments, formatDefinitions, generateRegistryByTypeSource, type DocumentAnalysis } from "../../../src/helpers/codegen";

describe("analyzeGraphQLDocuments", () => {
  it("should analyze query operations", () => {
    const docs = [
      {
        path: "/test/GetUser.gql",
        content: `query GetUser($id: ID!) { user(id: $id) { id name } }`,
      },
    ];

    const result = analyzeDocuments(docs);

    expect(result.operationsByType.query).toHaveLength(1);
    expect(result.operationsByType.query[0]).toEqual({
      kind: "operation",
      type: "query",
      name: "GetUser",
    });
  });

  it("should analyze mutation operations", () => {
    const docs = [
      {
        path: "/test/CreateUser.gql",
        content: `mutation CreateUser($name: String!) { createUser(name: $name) { id } }`,
      },
    ];

    const result = analyzeDocuments(docs);

    expect(result.operationsByType.mutation).toHaveLength(1);
    expect(result.operationsByType.mutation[0]!.name).toBe("CreateUser");
  });

  it("should analyze subscription operations", () => {
    const docs = [
      {
        path: "/test/OnUserCreated.gql",
        content: `subscription OnUserCreated { userCreated { id name } }`,
      },
    ];

    const result = analyzeDocuments(docs);

    expect(result.operationsByType.subscription).toHaveLength(1);
    expect(result.operationsByType.subscription[0]!.name).toBe("OnUserCreated");
  });

  it("should analyze fragment definitions", () => {
    const docs = [
      {
        path: "/test/UserFragment.gql",
        content: `fragment UserFields on User { id name email }`,
      },
    ];

    const result = analyzeDocuments(docs);

    expect(result.byFile.get("/test/UserFragment.gql")).toEqual([
      { kind: "fragment", name: "UserFields" },
    ]);
  });

  it("should throw on unnamed operations", () => {
    const docs = [
      {
        path: "/test/Unnamed.gql",
        content: `query { users { id } }`,
      },
    ];

    expect(() => analyzeDocuments(docs)).toThrow("Unnamed query operation");
  });

  it("should throw on duplicate operation names", () => {
    const docs = [
      {
        path: "/test/GetUser1.gql",
        content: `query GetUser { user { id } }`,
      },
      {
        path: "/test/GetUser2.gql",
        content: `query GetUser { user { name } }`,
      },
    ];

    expect(() => analyzeDocuments(docs)).toThrow("Duplicate query operation name");
  });

  it("should throw on duplicate fragment names", () => {
    const docs = [
      {
        path: "/test/Fragment1.gql",
        content: `fragment UserFields on User { id }`,
      },
      {
        path: "/test/Fragment2.gql",
        content: `fragment UserFields on User { name }`,
      },
    ];

    expect(() => analyzeDocuments(docs)).toThrow("Duplicate fragment name");
  });

  it("should handle multiple operations in different files", () => {
    const docs = [
      {
        path: "/test/Queries.gql",
        content: `
          query GetUser { user { id } }
          query GetUsers { users { id } }
        `,
      },
      {
        path: "/test/Mutations.gql",
        content: `mutation CreateUser { createUser { id } }`,
      },
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

describe("generateRegistryByTypeSource", () => {
  it("should generate empty registry for no operations", () => {
    const analysis: DocumentAnalysis["operationsByType"] = {
      query: [],
      mutation: [],
      subscription: [],
    };

    const result = generateRegistryByTypeSource(analysis);

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

    const result = generateRegistryByTypeSource(analysis);

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

    const result = generateRegistryByTypeSource(analysis);

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

    const result = generateRegistryByTypeSource(analysis);

    expect(result).toContain("import type { TypedDocumentNode }");
    expect(result).toContain("import * as ops from \"#graphql/operations\"");
    expect(result).toContain("type ResultOf<T>");
    expect(result).toContain("type VariablesOf<T>");
  });
});
