import { extname } from "node:path";

import type { Types } from "@graphql-codegen/plugin-helpers";
import { CodeFileLoader } from "@graphql-tools/code-file-loader";
import { GraphQLFileLoader } from "@graphql-tools/graphql-file-loader";
import { loadDocuments as gqlLoadDocuments } from "@graphql-tools/load";
import { createResolver } from "@nuxt/kit";
import type { Nuxt } from "@nuxt/schema";

const DOCUMENT_IGNORE_GLOBS = ["**/.nuxt/**", "**/.output/**", "**/dist/**", "**/node_modules/**"];
const GRAPHQL_FILE_EXTENSIONS = new Set([".gql", ".graphql"]);
const CODE_FILE_EXTENSIONS = new Set([".ts", ".mts", ".cts", ".js", ".mjs", ".cjs", ".vue"]);

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
      ignore: DOCUMENT_IGNORE_GLOBS,
      noRequire: true,
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

/**
 * Determine whether a changed file can affect the GraphQL document registry.
 *
 * GraphQL code files are checked via plucking only, which avoids importing user modules during
 * watch mode and prevents spurious side-effects from ordinary `.vue` / `.ts` edits.
 *
 * @param path Absolute file path reported by the builder watcher.
 * @param event Builder watcher event name.
 * @returns Whether the registry should be regenerated.
 */
export async function isGraphQLDocumentChange(path: string, event: string): Promise<boolean> {
  const extension = extname(path).toLowerCase();

  if (GRAPHQL_FILE_EXTENSIONS.has(extension)) {
    return true;
  }

  if (!CODE_FILE_EXTENSIONS.has(extension)) {
    return false;
  }

  if (event === "unlink" || event === "unlinkDir") {
    return true;
  }

  try {
    const docs = await new CodeFileLoader().load(path, {
      noRequire: true,
    });
    return docs.some((doc) => Boolean(doc.document));
  } catch {
    return true;
  }
}
