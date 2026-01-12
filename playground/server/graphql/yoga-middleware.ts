import { defineYogaMiddleware } from "../../../src/runtime/server/lib/define-yoga-middleware";

export default defineYogaMiddleware({
  async onRequest({ event }) {
    const customHeader = getRequestHeader(event, "x-custom-header");
    console.log("Yoga Request Middleware - X-Custom-Header:", customHeader);
  },
  async onResponse({ event }) {
    setHeader(event, "X-Custom-Yoga-Middleware-Response-Header", "my-custom-value");
  },
});
