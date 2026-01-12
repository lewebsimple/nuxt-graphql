import { removeFileExtension } from "./server-proxy";

// Generate a proxy module for the GraphQL context
export function getGraphQLContextProxy(contextPath?: string) {
  if (!contextPath) {
    return [
      `export const getGraphQLContext = async () => ({});`,
      `export type GraphQLContext = Awaited<ReturnType<typeof getGraphQLContext>>;`,
    ].join("\n");
  }
  return [
    `import context from ${JSON.stringify(removeFileExtension(contextPath))};`,
    ``,
    `export const getGraphQLContext = context.getGraphQLContext;`,
    `export type GraphQLContext = Awaited<ReturnType<typeof getGraphQLContext>>;`,
  ].join("\n");
}
