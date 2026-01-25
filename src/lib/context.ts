// ────────────────────────────────────────────────────────────────────────────────
// Context template
// ────────────────────────────────────────────────────────────────────────────────

import { splitModule } from "./split-module";

export type ContextInput = {
  importPaths: string[];
};

/**
 * Render the GraphQL context factory template
 * @param {ContextInput} input Context template input.
 * @returns .ts, .mjs and .d.ts source code
 */
export function getContextTemplate({ importPaths }: ContextInput): { ts: string; mjs: string; dts: string } {
  const contextImports = importPaths.map((importPath, index) => `import context${index} from ${JSON.stringify(importPath)};`);
  const contextTypes = ["{}", ...importPaths.map((_, index) => `Awaited<ReturnType<typeof context${index}>>`)];
  const contextArray = ["(event: H3Event) => ({})", ...importPaths.map((_, index) => `context${index}`)];

  const ts = `
import type { H3Event } from "h3";
${contextImports.join("\n")}

export type GraphQLContext = ${contextTypes.join(" & ")};

const contextFactories = [${contextArray.join(", ")}];

export async function createContext(event: H3Event): Promise<GraphQLContext> {
  return Object.assign(
    {},
    ...await Promise.all(contextFactories.map((factory) => factory(event)))
  )
}`.trim();

  return { ts, ...splitModule(ts) };
}
