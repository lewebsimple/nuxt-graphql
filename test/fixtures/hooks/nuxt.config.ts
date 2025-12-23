export default defineNuxtConfig({
  modules: ["../../../src/module"],
  graphql: {
    endpoint: "/api/graphql",
  },
});
