import { loadDocuments } from "@graphql-tools/load";
import { GraphQLFileLoader } from "@graphql-tools/graphql-file-loader";
import type { Source } from "@graphql-tools/utils";

/**
 * Load GraphQL documents from a glob pattern (cached).
 *
 * @param documentsGlob Glob pattern for .gql files.
 * @returns Parsed GraphQL sources (empty on errors).
 */
export async function getDocuments(documentsGlob: string): Promise<Source[]> {
  try {
    return await loadDocuments([
      documentsGlob,
      "!**/.cache/**",
      "!**/.nuxt/**",
      "!**/.output/**",
      "!**/dist/**",
      "!**/node_modules/**",
    ], { loaders: [new GraphQLFileLoader()] });
  }
  catch (error) {
    if (typeof error === "object" && error !== null && "name" in error && error.name === "NoTypeDefinitionsFound") {
      return [];
    }
    throw error;
  }
};
