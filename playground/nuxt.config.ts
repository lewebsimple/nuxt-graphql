export default defineNuxtConfig({
  modules: ["../src/module"],
  devtools: { enabled: true },
  compatibilityDate: "2025-12-13",
  graphql: {
    remoteSchemas: [
      {
        name: "swapi",
        endpoint: "https://swapi-graphql.netlify.app/graphql",
      },
    ],
  },
});
