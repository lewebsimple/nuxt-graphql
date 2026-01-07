export default defineRemoteMiddleware({
  onResponse({ operationName }) {
    console.log(`[SWAPI] Completed operation: ${operationName}`);
  },
});
