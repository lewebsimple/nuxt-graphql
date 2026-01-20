import NuxtGraphQL from "../../../src/module";

export default defineNuxtConfig({
  modules: [
    NuxtGraphQL,
  ],
  graphql: {
    client: {
      documents: "test/**/*.gql",
    },
    yoga: {
      schemas: {
        local: {
          type: "local",
          path: "~~/server/graphql/schema",
        },
      },
    },
  },
});
