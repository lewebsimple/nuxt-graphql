import type { DocumentNode, GraphQLSchema } from "graphql";
import { codegen } from "@graphql-codegen/core";
import type { Source } from "@graphql-tools/utils";

// Codegen plugins
import * as typescriptPlugin from "@graphql-codegen/typescript";
import * as typescriptOperationsPlugin from "@graphql-codegen/typescript-operations";
import * as typedDocumentNodePlugin from "@graphql-codegen/typed-document-node";

type OperationsTemplateInput = {
  schema: GraphQLSchema;
  documents: Source[];
};

/**
 * Render the typed operations template using GraphQL Codegen.
 *
 * @param {OperationsTemplateInput} options Operations template input.
 * @param options.schema Stitched GraphQL schema.
 * @param options.documents Parsed GraphQL documents.
 * @returns Generated TypeScript source code.
 */
export async function renderOperationsTemplate({ schema, documents }: OperationsTemplateInput): Promise<string> {
  // Run codegen (in-memory)
  const output = await codegen({
    filename: "operations.ts",
    // @graphql-codegen/core codegen supports GraphQLSchema at runtime, but types expect DocumentNode
    schema: schema as unknown as DocumentNode,
    documents,
    plugins: [
      { typescript: {} },
      { typescriptOperations: {} },
      { typedDocumentNode: {} },
    ],
    pluginMap: {
      typescript: typescriptPlugin,
      typescriptOperations: typescriptOperationsPlugin,
      typedDocumentNode: typedDocumentNodePlugin,
    },
    config: {
      defaultScalarType: "never",
      documentMode: "documentNode",
      documentVariableSuffix: "Document",
      enumsAsTypes: true,
      inlineFragmentTypes: "combine",
      omitOperationSuffix: true,
      operationResultSuffix: "Result",
      operationVariablesSuffix: "Variables",
      preResolveTypes: false,
      skipTypename: true,
      strictScalars: true,
      useTypeImports: true,
    },
  });

  return output;
}
