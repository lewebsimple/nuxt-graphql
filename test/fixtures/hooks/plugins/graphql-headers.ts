import { defineNuxtPlugin } from "nuxt/app";

export default defineNuxtPlugin((nuxtApp) => {
  // Test the graphql:error hook
  nuxtApp.hook("graphql:error", (error: Error) => {
    console.log("GraphQL Error:", error.message);
  });
});
