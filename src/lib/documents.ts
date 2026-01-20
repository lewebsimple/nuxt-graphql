import { loadDocuments as graphqlLoadDocuments } from "@graphql-tools/load";
import { GraphQLFileLoader } from "@graphql-tools/graphql-file-loader";
import type { Source } from "@graphql-tools/utils";

/**
 * Load GraphQL documents from a glob pattern while ignoring build artifacts.
 *
 * @param documents Glob pattern for .gql files.
 * @returns Parsed GraphQL sources (empty on errors).
 */
export async function loadDocuments(documents: string): Promise<Source[]> {
  try {
    return await graphqlLoadDocuments([
      documents,
      "!**/.cache/**",
      "!**/.nuxt/**",
      "!**/.output/**",
      "!**/dist/**",
      "!**/node_modules/**",
    ], { loaders: [new GraphQLFileLoader()] });
  }
  catch {
    return [];
  }
}
