import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  modules: ["../src/module"],
  devtools: { enabled: true },
  compatibilityDate: "2026-01-09",
  graphql: {
    context: "server/graphql/context.ts",
    schemas: {
      local: {
        type: "local",
        path: "server/graphql/schema.ts",
      },
      swapi: {
        type: "remote",
        url: "https://swapi-graphql.netlify.app/graphql",
        headers: {
          "X-Static-Header": "static-header-value",
        },
        middleware: "server/graphql/swapi-middleware.ts",
      },
    },
    saveSdl: "server/graphql/schema.graphql",
    middleware: "server/graphql/yoga-middleware.ts",
  },
});
