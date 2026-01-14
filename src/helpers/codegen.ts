import { generate, type CodegenConfig } from "@graphql-codegen/cli";
import type { GlobPattern } from "./file-operations";

/**
 * Run GraphQL Codegen with the specified configuration.
 */
export async function runGraphQLCodegen({ schema, documents, typedDocumentsPath }: {
  schema: string;
  documents: GlobPattern;
  typedDocumentsPath: string;
}) {
  const config: CodegenConfig = {
    schema,
    documents,
    generates: {
      // Typed document nodes
      [typedDocumentsPath]: {
        plugins: ["typescript", "typescript-operations", "typed-document-node"],
        config: {
          defaultScalarType: "never",
          documentMode: "documentNode",
          documentVariableSuffix: "Document",
          enumsAsTypes: true,
          inlineFragmentTypes: "combine",
          preResolveTypes: false,
          skipTypename: true,
          strictScalars: true,
          useTypeImports: true,
        },
      },
    },
    ignoreNoDocuments: true,
    silent: true,
  };
  const result: { filename: string }[] = await generate(config, true);
  return result.map(({ filename }) => filename);
}
