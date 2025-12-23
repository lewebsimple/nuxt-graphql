export default defineNuxtPlugin((nuxtApp) => {
  // Test the graphql:error hook
  nuxtApp.hook("graphql:error", (error) => {
    console.log("GraphQL Error:", error.message);
  });
});
