import NuxtGraphQL from "../../../src/module";

export default defineNuxtConfig({
  modules: [
    NuxtGraphQL,
  ],
  graphql: {
    schemas: {
      local: {
        type: "local",
        path: "server/graphql/schema.ts",
      },
    },
    documents: "tests/**/**/*.gql",
    saveConfig: ".nuxt/graphql/graphql.config.json",
  },
});
