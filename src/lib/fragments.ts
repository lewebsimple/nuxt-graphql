import { Kind } from "graphql";
import type { Source } from "@graphql-tools/utils";

type FragmentsTemplateInput = {
  documents: Source[];
};

/**
 * Render the fragment types module from GraphQL documents.
 *
 * @param {FragmentsTemplateInput} options Fragments template input.
 * @param options.documents Parsed GraphQL documents.
 * @returns Generated TypeScript source for the fragments module.
 */
export async function renderFragmentsTemplate({ documents }: FragmentsTemplateInput): Promise<string> {
  const fragments = collectFragments(documents);

  if (fragments.length === 0) {
    return `export { }`;
  }

  return [
    `export type {`,
    ...fragments.map((name) => `  ${name},`),
    `} from "./operations";`,
  ].join("\n");
}

/**
 * Extract unique fragment names from GraphQL documents.
 *
 * @param documents Parsed GraphQL documents.
 * @returns Fragment name entries.
 */
function collectFragments(documents: Source[]): string[] {
  const fragments = new Set<string>();
  for (const source of documents) {
    const doc = source.document;
    if (!doc) continue;
    for (const def of doc.definitions) {
      if (def.kind !== Kind.FRAGMENT_DEFINITION) continue;
      const name = def.name?.value;
      if (!name) continue;
      if (fragments.has(name)) {
        throw new Error(`Duplicate GraphQL fragment name "${name}"`);
      }
      fragments.add(name);
    }
  }
  return [...fragments.values()];
}
