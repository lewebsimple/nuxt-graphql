import MyModule from "../../../src/module";

export default defineNuxtConfig({
  modules: [MyModule],
  graphql: {
    schemas: {
      local: {
        type: "local",
        path: "server/graphql/schema.ts",
      },
    },
  },
});
