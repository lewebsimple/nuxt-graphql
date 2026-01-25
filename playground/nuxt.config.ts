export default defineNuxtConfig({
  modules: ["@lewebsimple/nuxt-graphql"],
  devtools: { enabled: true },
  compatibilityDate: "latest",
  graphql: {
    server: {
      context: ["~~/server/graphql/context"],
      schema: {
        local: {
          type: "local",
          path: "~~/server/graphql/schema",
        },
        swapi: {
          type: "remote",
          endpoint: "https://swapi-graphql.netlify.app/graphql",
          hooks: [
            "~~/server/graphql/swapi-hooks",
          ],
        },
      },
    },
  },
});
