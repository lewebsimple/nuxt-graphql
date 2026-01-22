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
export async function renderOperationsTemplate({ schema, documents }: OperationsTemplateInput): Promise<{ module: string; types: string }> {
  const content = await codegen({
    filename: "operations.ts",
    schema: schema as unknown as DocumentNode,
    documents,
    plugins: [
      {
        typescript: {
          avoidOptionals: true,
          defaultScalarType: "never",
          enumsAsTypes: true,
          immutableTypes: true,
          maybeValue: "T | null",
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
          immutableTypes: true,
          inlineFragmentTypes: "combine",
          maybeValue: "T | null",
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

  const docs = splitDocuments(content);
  const module = docs.map(({ name, object }) => `export const ${name} = ${object};`).join("\n");
  const types = `${content.replace(/export const \w+ = [\s\S]*?;\n?/g, "")}
declare module "#graphql/operations" {
  ${docs.map(({ name, type }) => `export const ${name}: ${type};`).join("\n  ")}
}`.trim();

  return { module, types };
}

type SplitDocument = {
  name: string;
  type: string;
  object: string;
};

function splitDocuments(content: string): SplitDocument[] {
  const documents: SplitDocument[] = [];
  const documentRegex = /export const (\w+) = ([\s\S]*?) as unknown as (DocumentNode<[^>]+>);/g;
  let match: RegExpExecArray | null;
  while ((match = documentRegex.exec(content))) {
    const [, name, object, type] = match;
    if (!name || !object || !type) {
      throw new Error("Invalid typed document matched while splitting documents.");
    }
    documents.push({ name, object: object.trim(), type });
  }
  return documents;
}
