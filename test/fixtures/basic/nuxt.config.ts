import NuxtGraphQL from "../../../src/module";

export default defineNuxtConfig({
  modules: [
    NuxtGraphQL,
  ],
  graphql: {
    client: {
      documents: "test/**/*.gql",
    },
    server: {
      schema: {
        local: {
          type: "local",
          path: "~~/server/graphql/schema",
        },
      },
    },
  },
});
