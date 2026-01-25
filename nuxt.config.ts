export default defineNuxtConfig({
  graphql: {
    client: {
      documents: "./src/**/*.gql",
    },
    saveConfig: ".nuxt/graphql.config.json",
    saveSDL: ".nuxt/schema.graphql",
  },
});
