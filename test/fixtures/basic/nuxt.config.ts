import NuxtGraphQL from "../../../src/module";

export default defineNuxtConfig({
  modules: [NuxtGraphQL],
  graphql: {
    server: {
      context: ["server/graphql/context-a.ts", "server/graphql/context-b.ts"],
      schema: [
        { type: "local", path: "server/graphql/schema-a.ts" },
        { type: "local", path: "server/graphql/schema-b.ts" },
      ],
    },
  },
});
