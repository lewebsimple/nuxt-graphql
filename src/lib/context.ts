import { createResolver } from "@nuxt/kit";
import type { Nuxt } from "@nuxt/schema";

import { stripExtension } from "./path";

/** GraphQL context input paths. */
export type ContextInput = {
  /** Context factory module paths. */
  paths: string[];
};

/**
 * Resolve context factory paths from Nuxt aliases.
 *
 * @param input Context paths input.
 * @param nuxt Nuxt instance.
 * @returns Resolved context input.
 */
export async function resolveContextInput(
  { paths }: ContextInput,
  nuxt: Nuxt,
): Promise<ContextInput> {
  const { resolvePath } = createResolver(nuxt.options.rootDir);
  return {
    paths: await Promise.all(
      paths.map(async (contextPath) => {
        const path = await resolvePath(contextPath, { alias: nuxt.options.alias });
        return path.replaceAll("\\", "/");
      }),
    ),
  };
}

/**
 * Build the virtual GraphQL context template.
 *
 * @param input Context paths input.
 * @returns Template source code.
 */
export function getContextTemplate({ paths }: ContextInput): string {
  const imports = [
    ...paths.map(
      (path, index) => `import factory${index} from ${JSON.stringify(stripExtension(path))};`,
    ),
    `import type { H3Event } from "h3";`,
  ];
  const factories = ["(_event: H3Event) => ({})", ...paths.map((_, index) => `factory${index}`)];
  const types = ["{}", ...paths.map((_, index) => `Awaited<ReturnType<typeof factory${index}>>`)];

  return [
    ...imports,
    "",
    `export type GraphQLContext = ${types.join(" & ")};`,
    "",
    `const factories = [${factories.join(", ")}];`,
    "",
    `export async function createContext(event: H3Event): Promise<GraphQLContext> {`,
    `  const contexts = await Promise.all(factories.map((factory) => factory(event)));`,
    `  return Object.assign({}, ...contexts);`,
    `}`,
  ].join("\n");
}
