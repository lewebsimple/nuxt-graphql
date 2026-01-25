// ────────────────────────────────────────────────────────────────────────────────
// Context template
// ────────────────────────────────────────────────────────────────────────────────

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
  const contextTsArray = ["(event: H3Event) => ({})", ...importPaths.map((_, index) => `context${index}`)];
  const contextMjsArray = ["(event) => ({})", ...importPaths.map((_, index) => `context${index}`)];

  const types = `
import type { H3Event } from "h3";
${contextImports.join("\n")}

export type GraphQLContext = ${contextTypes.join(" & ")};
  `.trim();

  const ts = `
${types}

const contextFactories = [${contextTsArray.join(", ")}];

export async function createContext(event: H3Event): Promise<GraphQLContext> {
  return Object.assign(
    {},
    ...await Promise.all(contextFactories.map((factory) => factory(event)))
  )
}`.trim();

  const mjs = `
${contextImports.join("\n")}

const contextFactories = [${contextMjsArray.join(", ")}];

export async function createContext(event) {
  return Object.assign(
    {},
    ...await Promise.all(contextFactories.map((factory) => factory(event)))
  )
}
  `.trim();

  const dts = `
${types}

export async function createContext(event: H3Event): Promise<GraphQLContext>;
  `.trim();

  return { ts, mjs, dts };
}
