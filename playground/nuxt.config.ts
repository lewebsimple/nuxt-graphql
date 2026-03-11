export default defineNuxtConfig({
  modules: ["@lewebsimple/nuxt-graphql"],
  devtools: { enabled: true },
  compatibilityDate: "latest",
  graphql: {
    server: {
      context: ["server/graphql/context.ts"],
      schema: [
        { type: "local", path: "server/graphql/schema.ts" },
        { type: "remote", endpoint: "https://swapi-graphql.netlify.app/graphql" },
      ],
    },
  },
});
