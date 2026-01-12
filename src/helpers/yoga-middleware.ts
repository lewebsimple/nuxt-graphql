import { removeFileExtension } from "./server-proxy";

// Generate a proxy module for the request middleware
export function getYogaMiddlewareProxy(middlewarePath?: string) {
  if (!middlewarePath) {
    return [
      `export const yogaMiddlewareHandler = undefined;`,
    ].join("\n");
  }

  return [
    `import middleware from ${JSON.stringify(removeFileExtension(middlewarePath))};`,
    ``,
    `export const yogaMiddlewareHandler = middleware.yogaMiddlewareHandler;`,
  ].join("\n");
}
