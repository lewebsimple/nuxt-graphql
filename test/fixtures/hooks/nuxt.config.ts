export default defineNuxtConfig({
  modules: ["../../../src/module"],
  graphql: {
    schemas: {
      local: {
        type: "local",
        path: "server/graphql/schema.ts",
      },
    },
  },
});
