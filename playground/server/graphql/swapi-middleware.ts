export default {
  onResponse({ operationName }) {
    console.log(`[SWAPI] Completed operation: ${operationName}`);
  },
} satisfies RemoteMiddleware;
