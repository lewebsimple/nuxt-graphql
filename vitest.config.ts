import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Runtime composables import Nuxt built-ins from `#app`; unit tests substitute a stub that
      // reproduces the `useAsyncData` transform and payload semantics they rely on.
      "#app": fileURLToPath(new URL("./test/stubs/nuxt-app.ts", import.meta.url)),
    },
  },
});
