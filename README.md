# Nuxt GraphQL

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

Opinionated Nuxt module that wires a typed GraphQL server + client into your app.

[✨ &nbsp;Release Notes](/CHANGELOG.md)


## Features

- 🧘 **GraphQL Yoga** server at `/api/graphql` (**GraphiQL** in dev) + **SSE subscriptions**
- 🪡 **Stitched schema** from local and/or remote schemas (remote introspection at build time)
- 🪄 Code generation from `.gql` documents → **typed documents nodes** + **Zod** input schemas output
- 🧠 **Type-safe GraphQL helpers** for **queries, mutations, and subscriptions**, driven by **operation names** and shared across **client + server routes**
- 🧊 **SSR-friendly** by default: request header/cookie forwarding + no-HTTP server execution helpers
- 🚀 **Query caching** for `useGraphQLQuery` (cache policies + optional persistence in localStorage)
- 🪝 **Optional hooks**: Yoga middleware + per-remote executor middleware + client error hook (`graphql:error`)


## Getting started

Install the module to your Nuxt application with one command:

```bash
pnpx nuxi module add @lewebsimple/nuxt-graphql
```


### Configuration

Declare your schemas, context, documents glob and any optional middleware in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ["@lewebsimple/nuxt-graphql"],
  graphql: {
    // Schemas to stitch together (local and/or remote)
    schemas: {
      local: {
        type: "local",
        path: "server/graphql/schema.ts",
      },
      // Remote schema example
      swapi: {
        type: "remote",
        url: "https://swapi-graphql.netlify.app/graphql",
        // Optional: static headers for this remote
        headers: {
          "X-Static-Header": "static-header-value",
        },
        // Optional: per-remote execution middleware (onRequest / onResponse / onError hooks)
        middleware: "server/graphql/swapi-middleware.ts",
      },
    },
    
    // Optional: custom GraphQL context (defaults to {})
    context: "server/graphql/context.ts",

    // Optional: documents glob (defaults to **/*.gql)
    documents: "**/*.gql",

    // Optional: Yoga middleware (onRequest / onResponse hooks)
    middleware: "server/graphql/yoga-middleware.ts",

    // Optional: query caching (client-side only)
    // - In-memory cache uses Nuxt `useAsyncData`/`useNuxtData`
    // - Persistence in localStorage is enabled when `ttl` is set
    // - Version / prefix allow cache invalidation accross deployments
    cache: {
      cachePolicy: "cache-first", // "no-cache" | "cache-first" | "network-first" | "swr"
      cacheVersion: "1",
      keyPrefix: "gql",
      // Persist cache entries in localStorage with TTL in seconds
      // - 0 = never expires
      // - undefined = persistence disabled
      ttl: 60,
    },

    // Optional: save path for the generated stitched SDL (defaults to .nuxt/graphql/schema.graphql)
    sdl: "server/graphql/schema.graphql",
  },
});
```


### Define your schema(s) (local and/or remote)

**Local schemas** must be located inside `server/` and export an executable `GraphQLSchema` using the tool of your choice (graphql-yoga, Pothos, etc).

⚠️ Using auto-imported utilities or importing from aliases might break code generation.

For the example configuration above, create `server/graphql/schema.ts`:

```ts
import { createSchema } from "graphql-yoga";
import type { GraphQLContext } from "#graphql/context";

export const schema = createSchema<GraphQLContext>({
  typeDefs: /* GraphQL */ `
    type Query {
      hello: String!
    }
    type Mutation {
      ping(message: String!): String!
    }
    type Subscription {
      time: String!
    }
  `,
  resolvers: {
    Query: {
      hello: () => "Hello from Nuxt GraphQL!",
    },
    Mutation: {
      ping: (_parent, args) => `pong: ${args.message}`,
    },
    Subscription: {
      time: {
        subscribe: async function* () {
          while (true) {
            yield { time: new Date().toISOString() };
            await new Promise((r) => setTimeout(r, 1000));
          }
        },
      },
    },
  },
});
```

**Remote schemas** are introspected at build time from the required endpoint URL. Each remote can be configured with optional static headers and remote execution middleware (see configuration above).


### Define a type-safe GraphQL context (optional)

The GraphQL context can be user-defined with the provided `defineGraphQLContext` helper. This ensures proper server-side typing by inferring the type from the return value of the context creation function. The `GraphQLContext` type can be imported from the `#graphql/context` server alias.

For example, providing the user from the `nuxt-auth-utils` session with the configuration above, create `server/graphql/context.ts`:

```ts
import { defineGraphQLContext } from "@lewebsimple/nuxt-graphql";
import { getUserSession } from "nuxt-auth-utils";

export default defineGraphQLContext(async (event) => {
  const session = await getUserSession(event);
  return {
    user: session?.user ?? null,
  };
});
```


### Write GraphQL documents (`.gql`)

Write operations in `.gql` document files; operation names become registry keys like `useGraphQLQuery("HelloWorld")`.

⚠️ Operation names are required and must be unique.

By default, the module scans `**/*.gql` and generates:

- Typed documents in `#graphql/typed-documents`
- Operation registry by name in `#graphql/registry` (used internally)
- Zod schemas in `#graphql/zod`
- A `graphql.config.json` at the project root (editor tooling)

Example document files (filenaming convention can vary):
```graphql
# app/graphql/HelloWorld.query.gql
query HelloWorld {
  hello
}
```

```graphql
# app/graphql/Ping.mutation.gql
mutation Ping($message: String!) {
  ping(message: $message)
}
```

```graphql
# app/graphql/Time.subscription.gql
subscription Time {
  time
}
```

That's it! You can now use Nuxt GraphQL in your Nuxt app ✨

### Fragments

Fragments are fully supported and are the recommended way to share selection sets across operations.

- Fragment names must be unique across all `.gql` files (duplicates throw during generation).
- Fragments are generated into `#graphql/typed-documents` by GraphQL Codegen:
  - a TypeScript type like `TheFilmFragment`
  - and a document constant like `TheFilmFragmentDoc`
- Fragments are **not executable by themselves** (GraphQL requires an operation), and they are **not part of the `#graphql/registry`**. The auto-imported composables and server utilities only accept operation names (`query` / `mutation` / `subscription`).

Example with a fragment:

```graphql
# app/graphql/SwapiFilms.query.gql
fragment TheFilm on Film {
  title
  releaseDate
}

query SwapiFilms {
  allFilms {
    films {
      ...TheFilm
    }
  }
}
```

From TypeScript, you can also use fragment types explicitly when you need them:

```ts
import type { TheFilmFragment } from "#graphql/typed-documents";
```


### Use the auto-imported composables

The auto-imported operation composables allow executing **queries**, **mutations** and **subscriptions** based on their registry name with full type-safety (variables and return value).

```ts
// Query (useAsyncData under the hood)
const { data, pending, error, refresh } = await useGraphQLQuery(
  "HelloWorld", // Registry name, i.e. "query HelloWorld { hello }"
  undefined, // Type-safe variables
  {
    // Custom request headers
    headers: {
      "X-Request-Header": "request-header-value"
    },
    // Additional useAsyncData options
    // lazy: true,
  },
);

// Mutation
const { mutate } = useGraphQLMutation("Ping", {
  // Custom request headers
  headers: {
    "X-Request-Header": "request-header-value"
  },
});
const { data, pending, error } = await mutate({ message: "Hello from ping mutation!" }, {
  // Each `mutate` call may send additional headers
  headers: {
    "X-Mutate-Header": "mutate-header-value",
  },
});

// Subscription (client-only, SSE)
const { data, error, start, stop } = useGraphQLSubscription("Time");
// data and error are shallowRef
```

### Use the auto-imported server-side utilities

In server routes, you can execute **queries** and **mutations** directly against the stitched schema (no HTTP roundtrip):

```ts
export default defineEventHandler(async (event) => {
  // Server-side GraphQL query example
  const { hello } = await useServerGraphQLQuery(event, "HelloWorld", undefined, {
    headers: {
      "X-Server-Header": "server-header-value",
    },
  });

  // Server-side GraphQL mutation example
  const { mutate } = useServerGraphQLMutation(event, "Ping", {
    headers: {
      "X-Server-Header": "server-header-value",
    },
  });
  const { ping } = await mutate({ message: hello }, {
    headers: {
      "X-Mutation-Header": "mutation-header-value",
    },
  });

  return { ping };
});
```

The function signature is almost identical to the auto-imported composables, except you need to pass `event` as the first argument (and of course queries don't rely on `useAsyncData`).

Also, resulting data is returned directly from `useServerGraphQLQuery` and `mutate` (throws an error on failure).


### Query caching (client-side only)

`useGraphQLQuery` can cache **query results** based on the global cache configuration (see configuration above) and per-query overrides (see below).

- In-flight requests are **deduplicated** (same operation + variables → one network call).
- **In-memory** cache uses Nuxt `useAsyncData`/`useNuxtData`.
- **Persisted** cache stores entries in `localStorage` for `ttl` seconds (`0` = never expires).

#### Cache policies

- `"no-cache"`: always fetches from the network (still dedupes in-flight).
- `"cache-first"`: returns cached value when present, otherwise fetches.
- `"network-first"`: tries the network first, falls back to cached value on error.
- `"swr"` (stale-while-revalidate): returns cached value immediately (when present) and refreshes in the background.

#### Per-query overrides

Caching configuration can be overridden per-query:

```ts
const { data } = await useGraphQLQuery("HelloWorld", undefined, {
  cache: {
    cachePolicy: "network-first",
    ttl: undefined, // disable persistence for this call
  },
});
```

#### Manual invalidation

On the client, `useGraphQLCache()` is used to invalidate in-memory and/or persisted entries:

```ts
const { invalidateByKey, invalidateByOperation, invalidateAll } = useGraphQLCache();

// Invalidate a single entry (operation + variables)
await invalidateByKey("HelloWorld", {});

// Invalidate all entries for an operation (all variables)
await invalidateByOperation("HelloWorld");

// Optional: target a specific layer
await invalidateByOperation("HelloWorld", { layer: "persisted" });

// Invalidate all entries
await invalidateAll();
```


### Yoga middleware (optional)

You can define custom logic around the Yoga event handler by using the provided `defineYogaMiddleware` helper with the following hooks:
- `onRequest` runs before Yoga handles the request;
- `onResponse` runs after and can replace the outgoing `Response` via `setResponse`.

For the example configuration above, create `server/graphql/yoga-middleware.ts`:

```ts
import { defineYogaMiddleware } from "@lewebsimple/nuxt-graphql";
import { getUserSession } from "nuxt-auth-utils";

export default defineYogaMiddleware({
  async onRequest({ event, context, request }) {
    const session = await getUserSession(event);
    if (!session?.user) {
      throw createError({ statusCode: 401, message: "Unauthorized" });
    }
  },
  async onResponse({ event, context, request, response, setResponse }) {
    setHeader(event, "X-Custom-Yoga-Middleware-Response-Header", "my-custom-value");
  },
});
```

### Remote executor middleware (optional, per remote)

You can define custom logic around the remote executor (from `@graphql-tools/utils`) for each one of your remote schema by using the provided `defineRemoteExecMiddleware` helper with the following hooks:
- `onRequest` runs before the fetch (headers are mutable);
- `onResponse` runs after an OK response before JSON parsing (cloned response);
- `onError` runs for non-2xx responses, GraphQL errors returned in the payload, JSON parse failures, or network errors (the `response` can be `undefined` in that last case).

⚠️ Remote executor middlewares don't have access to the H3 `event` handled by Yoga since they are executed in the context of the delegated subschema resolution.

For the example configuration above, create `server/graphql/swapi-middleware.ts`:

```ts
import { defineRemoteExecMiddleware } from "@lewebsimple/nuxt-graphql";

export default defineRemoteExecMiddleware({
  onRequest({ remoteName, operationName, context, fetchOptions }) {
    console.log(`SWAPI Request Middleware [${remoteName} - ${operationName}]`);
    fetchOptions.headers.set("X-Remote-Exec-Request-Header", "custom-value");
  },
  onResponse({ remoteName, operationName, context, response }) {
    console.log(`SWAPI Response Middleware [${remoteName} - ${operationName}]`);
  },
  onError({ remoteName, operationName, error }) {
    console.error(`SWAPI Error Middleware [${remoteName} - ${operationName}]:`, error);
  },
});
```

### Client error hook (optional)

Handle normalized GraphQL errors globally on the client (toast, logging, etc.).

The client calls the `graphql:error` Nuxt hook when a `graphql-request` response contains errors:

```ts
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook("graphql:error", (error) => {
    console.error("GraphQL error", error);
  });
});
```


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

[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt
[nuxt-href]: https://nuxt.com
