type ContextTemplateInput = {
  contextModules: string[];
};

/**
 * Render the GraphQL context runtime module.
 *
 * @param {ContextTemplateInput} options Context template input.
 * @param options.contextModules Absolute module paths to context factories.
 * @returns TypeScript source for the generated context module.
 */
export function renderContextTemplate({ contextModules }: ContextTemplateInput): string {
  const contextImports = contextModules.map((contextModule, index) => `import { createContext as createContext${index} } from '${contextModule}';`);
  const contexts = contextModules.map((_, index) => `createContext${index}(event)`);
  return `
${contextImports.join("\n")}

export async function createContext(event) {
  const parts = await Promise.all([${contexts.join(", ")}]);
  return Object.assign({}, ...parts);
}`.trim();
}
