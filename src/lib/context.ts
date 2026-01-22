type ContextTemplateInput = {
  contextModules: string[];
};

/**
 * Render the GraphQL context runtime module.
 *
 * @param {ContextTemplateInput} options Context template input.
 * @param options.contextModules Absolute module paths to context factories.
 * @returns .mjs source for the generated context module.
 */
export function renderContextTemplate({ contextModules }: ContextTemplateInput): string {
  const contextImports = contextModules.map((contextModule, index) => `import createContext${index} from '${contextModule}';`);
  const contexts = contextModules.map((_, index) => `createContext${index}(event)`);
  return `
${contextImports.join("\n")}

export async function createContext(event) {
  const parts = await Promise.all([${contexts.join(", ")}]);
  return Object.assign({}, ...parts);
}`.trim();
}

/**
 * Render the GraphQL context types module.
 * @param {ContextTemplateInput} options Context template input.
 * @param options.contextModules Absolute module paths to context factories.
 * @returns .d.ts source for the generated context types module.
 */
export function renderContextTypesTemplate({ contextModules }: ContextTemplateInput): string {
  const contextImports = contextModules.map((module, index) => `import createContext${index} from ${JSON.stringify(module)};`);
  const contextTypes = ["{}", ...contextModules.map((_, index) => `Awaited<ReturnType<typeof createContext${index}>>`)];

  return `
import type { H3Event } from "h3";
${contextImports.join("\n")}

declare module "#graphql/context" {
  export type GraphQLContext = ${contextTypes.join(" & ")};
  export function createContext(event: H3Event): Promise<GraphQLContext>;
}`.trim();
}
