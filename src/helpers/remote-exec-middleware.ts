import { removeFileExtension } from "./server-proxy";

// Generate a proxy module for the remote exec middleware
export function getRemoteExecMiddlewareProxy(middlewarePath?: string) {
  if (!middlewarePath) {
    return [
      `export const remoteExecMiddlewareHandler = undefined;`,
    ].join("\n");
  }

  return [
    `import middleware from ${JSON.stringify(removeFileExtension(middlewarePath))};`,
    ``,
    `export const remoteExecMiddlewareHandler = middleware.remoteExecMiddlewareHandler;`,
  ].join("\n");
}
