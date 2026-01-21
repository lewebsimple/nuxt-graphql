type ContextTemplateInput = {
  contextModules: string[];
};

/**
 * Render the virtual module that builds GraphQL context at runtime.
 *
 * @param {ContextTemplateInput} options Context template input.
 * @param options.contextModules Absolute module paths to context factories.
 * @returns TypeScript source for the generated context module.
 */
export function renderContextTemplate({ contextModules }: ContextTemplateInput): string {
  const imports = contextModules.map((module, index) => `import context${index} from ${JSON.stringify(module)};`);
  const types = ["{}", ...contextModules.map((_, index) => `Awaited<ReturnType<typeof context${index}>>`)];

  return [
    `import type { H3Event } from "h3";`,
    ...imports,
    "",
    `export type GraphQLContext = ${types.join(" & ")};`,
    "",
    "export async function createContext(event: H3Event): Promise<GraphQLContext> {",
    "  const parts = await Promise.all([",
    "    () => ({}),",
    ...contextModules.map((_, index) => `    context${index}(event),`),
    "  ]);",
    "  return Object.assign({}, ...parts) as GraphQLContext;",
    "}",
  ].join("\n");
}
