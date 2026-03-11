import type { Types } from "@graphql-codegen/plugin-helpers";
import { CodeFileLoader } from "@graphql-tools/code-file-loader";
import { GraphQLFileLoader } from "@graphql-tools/graphql-file-loader";
import { loadDocuments as gqlLoadDocuments } from "@graphql-tools/load";
import { createResolver } from "@nuxt/kit";
import type { Nuxt } from "@nuxt/schema";

/**
 * Resolve GraphQL document glob paths.
 *
 * @param globs Input glob patterns.
 * @param nuxt Nuxt instance.
 * @returns Resolved glob patterns.
 */
export async function resolveDocumentGlobs(globs: string[], nuxt: Nuxt): Promise<string[]> {
  const { resolvePath } = createResolver(nuxt.options.rootDir);
  return Promise.all(
    globs.map(async (glob) =>
      (await resolvePath(glob, { alias: nuxt.options.alias })).replaceAll("\\", "/"),
    ),
  );
}

/**
 * Load GraphQL documents from glob patterns.
 *
 * @param globs Resolved glob patterns.
 * @returns Unique document files with parsed documents.
 */
export async function loadDocuments(globs: string[]): Promise<Types.DocumentFile[]> {
  if (!globs.length) return [];

  try {
    const docs = await gqlLoadDocuments(globs, {
      loaders: [new GraphQLFileLoader(), new CodeFileLoader()],
      ignore: ["**/.nuxt/**", "**/.output/**", "**/dist/**", "**/node_modules/**"],
    });

    const seen = new Set<string>();
    return docs.filter((doc) => {
      const key = `${doc.location ?? ""}:${doc.rawSDL ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return Boolean(doc.document);
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "NoTypeDefinitionsFound"
    ) {
      return [];
    }
    throw error;
  }
}
