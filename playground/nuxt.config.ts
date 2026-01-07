export default defineNuxtConfig({
  modules: ["../src/module"],
  devtools: { enabled: true },
  compatibilityDate: "2025-12-13",
  graphql: {
    schemas: {
      local: {
        type: "local",
        path: "server/graphql/schema.ts",
      },
      swapi: {
        type: "remote",
        url: "https://swapi-graphql.netlify.app/graphql",
        middleware: "server/graphql/swapi-middleware.ts",
      },
    },
  },
});
