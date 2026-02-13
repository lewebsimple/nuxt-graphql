import NuxtGraphQL from "../../../src/module";

export default defineNuxtConfig({
  modules: [
    NuxtGraphQL,
  ],
  graphql: {
    server: {
      schema: {
        local: { type: "local", path: "./server/graphql/schema.ts" },
      },
    },
    saveSDL: ".nuxt/graphql/schema.graphql",
  },
});
