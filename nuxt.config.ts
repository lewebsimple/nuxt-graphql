export default defineNuxtConfig({
  typescript: {
    nodeTsConfig: {
      include: ["./.nuxt/types/nuxt-graphql.*"],
    },
  },
  graphql: {
    client: {
      documents: "./src/**/*.gql",
    },
    saveConfig: ".nuxt/graphql.config.json",
    saveSDL: ".nuxt/schema.graphql",
  },
});
