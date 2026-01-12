import { defineRemoteExecMiddleware } from "../../../src/runtime/server/lib/define-remote-exec-middleware";

export default defineRemoteExecMiddleware({
  onRequest({ remoteName, operationName, fetchOptions }) {
    console.log(`SWAPI Request Middleware [${remoteName} - ${operationName}]`);
    fetchOptions.headers.set("X-Remote-Exec-Request-Header", "custom-value");
  },
  onResponse({ remoteName, operationName }) {
    console.log(`SWAPI Response Middleware [${remoteName} - ${operationName}]`);
  },
  onError({ remoteName, operationName, error }) {
    console.error(`SWAPI Error Middleware [${remoteName} - ${operationName}]:`, error);
  },
});
