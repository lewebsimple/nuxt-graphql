# Nuxt GraphQL

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

Opinionated Nuxt module that ships a stitched GraphQL Yoga server, typed GraphQL Codegen, and client/server composables powered by graphql-request and graphql-sse.

- ✨ [Release Notes](/CHANGELOG.md)
- 🏀 [Online playground](https://stackblitz.com/github/lewebsimple/nuxt-graphql?file=playground%2Fapp.vue)

## Features

- 🧘‍♂️ GraphQL Yoga handler at `/api/graphql` with GraphiQL in development.
- 🪡 Schema stitching: mix local schemas and remote endpoints (with per-source headers). Stitched SDL is emitted to `server/graphql/schema.graphql` (configurable).
- 🚦 Remote middleware hooks: per-remote `onRequest` / `onResponse` callbacks to tweak headers, log responses, or short-circuit requests before forwarding.
- 🪄 Code generation: scans named operations in `**/*.gql` (across Nuxt layers), generates typed documents, operations, registry (`#graphql/registry`), and optional Zod validation.
- 🧩 Typed composables: `useGraphQLQuery`, `useGraphQLMutation`, `useGraphQLSubscription` consume registry names (e.g. `useGraphQLQuery("Hello")`). Server equivalents mirror the API for Nitro handlers.
- 🚀 Caching and dedupe: in-memory or localStorage TTL cache, in-flight request deduplication, and refresh callbacks driven by runtime config.
- 📡 SSE subscriptions: client-only via graphql-sse, using the same registry documents.
- 🛡️SSR-friendly clients: forward `cookie` and `authorization` headers automatically on the server.

## Quick start

Install the module to your Nuxt application with one command:

```bash
pnpx nuxi module add @lewebsimple/nuxt-graphql
```

Configure at least one schema (local or remote) and optionnally your context (path to your context factory). Example with a local schema and remote stitched source:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@lewebsimple/nuxt-graphql"],
  graphql: {
    // Optional: path to your GraphQL context factory
    // Defaults to src/runtime/server/lib/default-context.ts if omitted
    context: "server/graphql/context.ts",
    schemas: {
      local: { type: "local", path: "server/graphql/schema.ts" },
      swapi: {
        type: "remote",
        url: "https://swapi-graphql.netlify.app/.netlify/functions/index",
        middleware: "server/graphql/swapi-middleware.ts",
      },
    },
    codegen: {
      documents: "**/*.gql", // only named operations allowed
      saveSchema: "server/graphql/schema.graphql",
    },
    client: {
      cache: { enabled: true, ttl: 60_000, storage: "memory" },
      headers: {},
    },
  },
});
```

Define context (optional) in `server/graphql/context.ts`:

```ts
import type { H3Event } from "h3";

export async function createContext(event: H3Event) {
  return { event, user: event.context.user };
}
```

Write named operations in `.gql` files and use the auto-generated composables by operation name:

```ts
const { data, pending, error } = useGraphQLQuery("Hello", { name: "world" });
const { mutate } = useGraphQLMutation("Ping");
const { data: time } = useGraphQLSubscription("Time");
```

That's it! You can now use Nuxt GraphQL in your Nuxt app ✨

Yoga GraphiQL is available at `http://localhost:3000/api/graphql` by default.

Optional: add a remote middleware at `server/graphql/swapi-middleware.ts` to adjust headers or log activity for stitched sources:

```ts
export default {
  async onRequest({ fetchOptions }) {
    return {
      ...fetchOptions,
      headers: {
        ...fetchOptions.headers,
        "x-swapi-api-key": process.env.SWAPI_TOKEN ?? "",
      },
    };
  },
  async onResponse({ operationName }) {
    console.log(`[SWAPI] completed ${operationName ?? "unknown"}`);
  },
} satisfies RemoteMiddleware
```

Both hooks are optional; return a new `RequestInit` from `onRequest` to override the outgoing fetch, or use `onResponse` for side-effects such as metrics and logging.

## Development notes

- Generated artifacts live under `.nuxt/graphql` and `.graphqlrc`; they are rewritten only when contents change.
- Operations must be **named and unique**; duplicates or unnamed operations fail codegen.
- SSE subscriptions are client-only; do not call `$graphqlSSE` on the server.
- Cache defaults come from `runtimeConfig.public.graphql.cache`; pass `cache: false` to per-call options to bypass.

## Contribution

<details>
  <summary>Local development</summary>
  
  ```bash
  # Install dependencies
  pnpm install
  
  # Generate type stubs
  pnpm run dev:prepare
  
  # Develop with the playground
  pnpm run dev
  
  # Build the playground
  pnpm run dev:build
  
  # Run ESLint
  pnpm run lint
  
  # Run Vitest
  pnpm run test
  pnpm run test:watch
  
  # Release new version
  pnpm run release
  ```

</details>


<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/@lewebsimple/nuxt-graphql/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/@lewebsimple/nuxt-graphql

[npm-downloads-src]: https://img.shields.io/npm/dm/@lewebsimple/nuxt-graphql.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npm.chart.dev/@lewebsimple/nuxt-graphql

[license-src]: https://img.shields.io/npm/l/@lewebsimple/nuxt-graphql.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/@lewebsimple/nuxt-graphql

[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js
[nuxt-href]: https://nuxt.com
