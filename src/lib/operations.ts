import type { DocumentNode, GraphQLSchema } from "graphql";
import { codegen } from "@graphql-codegen/core";
import type { Source } from "@graphql-tools/utils";

// Codegen plugins
import * as typescriptPlugin from "@graphql-codegen/typescript";
import * as typescriptOperationsPlugin from "@graphql-codegen/typescript-operations";
import * as typedDocumentNodePlugin from "@graphql-codegen/typed-document-node";
import { splitModule } from "./split-module";

// ────────────────────────────────────────────────────────────────────────────────
// Operations template (cached GraphQL Codegen)
// ────────────────────────────────────────────────────────────────────────────────

export type OperationsInput = {
  loadSchema: () => Promise<GraphQLSchema>;
  loadDocuments: (documentGlob: string) => Promise<Source[]>;
  documentGlob: string;
};

/**
 * Render typed operations template using GraphQL Codegen.
 *
 * @param {OperationsInput} input Operations template input.
 * @returns Generated .ts / .mjs / .d.ts source code.
 */
export async function getOperationsTemplate({ loadSchema, loadDocuments, documentGlob }: OperationsInput): Promise<{ ts: string; mjs: string; dts: string }> {
  const ts = await codegen({
    filename: "operations.ts",
    schema: await loadSchema() as unknown as DocumentNode,
    documents: await loadDocuments(documentGlob),
    plugins: [
      {
        typescript: {
          avoidOptionals: true,
          defaultScalarType: "never",
          enumsAsTypes: true,
          maybeValue: "T | undefined",
          preResolveTypes: false,
          strictScalars: true,
          useTypeImports: true,
        },
      },
      {
        typescriptOperations: {
          avoidOptionals: true,
          defaultScalarType: "never",
          enumsAsTypes: true,
          exportFragmentSpreadSubTypes: true,
          inlineFragmentTypes: "combine",
          maybeValue: "T | undefined",
          operationResultSuffix: "Result",
          operationVariablesSuffix: "Variables",
          preResolveTypes: false,
          skipTypename: true,
          strictScalars: true,
          useTypeImports: true,
        },
      },
      {
        typedDocumentNode: {
          documentVariableSuffix: "Document",
          operationResultSuffix: "Result",
          operationVariablesSuffix: "Variables",
          optimizeDocumentNode: true,
          useTypeImports: true,

        },
      },
    ],
    pluginMap: {
      typescript: typescriptPlugin,
      typescriptOperations: typescriptOperationsPlugin,
      typedDocumentNode: typedDocumentNodePlugin,
    },
    config: {},
  });
  return { ts, ...splitModule(ts) };
}
