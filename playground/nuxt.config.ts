export default defineNuxtConfig({
  modules: ["@lewebsimple/nuxt-graphql"],
  devtools: { enabled: true },
  compatibilityDate: "latest",
  graphql: {
    yoga: {
      context: ["~~/server/graphql/context"],
      schemas: {
        local: {
          type: "local",
          path: "~~/server/graphql/schema",
        },
        swapi: {
          type: "remote",
          url: "https://swapi-graphql.netlify.app/graphql",
          hooks: [
            "~~/server/graphql/swapi-hooks",
          ],
        },
      },
    },
  },
});
