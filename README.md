# Nuxt GraphQL

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

Opinionated Nuxt module that wires a typed GraphQL server + client into your app.

[✨ &nbsp;Release Notes](/CHANGELOG.md)


## Features

- 🧘 **GraphQL Yoga** server at `/api/graphql` (**GraphiQL** in dev) + **SSE subscriptions**
- 🪡 **Stitched schema** from local and/or remote schemas (remote introspection at build time; subscriptions stripped)
- 🪄 Code generation from `.gql` documents → **typed operation documents** + **registry**
- 🧠 **Type-safe helpers** for **queries, mutations, and subscriptions**, shared across **client + server**
- 🧊 **SSR-friendly** by default: request header forwarding + server-side schema execution helpers
- 🚀 **Client-side cache** for `useAsyncGraphQLQuery` (cache policies + optional persistence in localStorage)
- 🧯 **Unified error model** via `GraphQLExecutionResult` and `NormalizedError`


## Getting started

Install the module to your Nuxt application with one command:

```bash
pnpx nuxt module add @lewebsimple/nuxt-graphql
```


### Configuration

Declare your schemas, context, documents glob and optional client cache in [nuxt.config.ts](nuxt.config.ts):

```ts
export default defineNuxtConfig({
  modules: ["@lewebsimple/nuxt-graphql"],
  graphql: {
    server: {
      // Schemas to stitch together (local and/or remote)
      schema: {
        // Local schema example
        local: { type: "local", path: "server/graphql/schema.ts" },
      
        // Remote schema example
        swapi: {
          type: "remote",
          url: "https://swapi-graphql.netlify.app/graphql",
          // Optional: static headers for this remote
          headers: {
            "X-Static-Header": "static-header-value",
          },
          // Optional: per-remote execution hooks
          hooks: ["server/graphql/swapi-hooks.ts"],
        },
      },

      // Optional: custom GraphQL context factories (defaults to [])
      context: ["server/graphql/context.ts"],
    },

    client: {
      // Optional: documents glob (defaults to **/*.gql)
      documents: "**/*.gql",

      // Optional: headers forwarded from SSR to graphql-request (defaults to ["authorization", "cookie"])
      ssrForwardHeaders: ["authorization", "cookie"],

      // Optional: query caching (client-side only, for useAsyncGraphQLQuery)
      cache: {
        policy: "cache-first", // "no-cache" | "cache-first" | "network-first" | "swr"
        keyVersion: "1",
        keyPrefix: "gql",
        // Persist cache entries in localStorage with TTL in seconds
        // - 0 = never expires
        // - undefined = persistence disabled
        ttl: 60,
      },
    },

    // Optional: save path for the stitched SDL (defaults to "server/graphql/schema.graphql")
    saveSDL: "server/graphql/schema.graphql",

    // Optional: save path for the generated GraphQL config (defaults to "graphql.config.json")
    saveConfig: "graphql.config.json",
  },
});
```


### Define GraphQL schema (local and/or remote)

**Local schemas** must live under `server/` and export a `GraphQLSchema` as `schema`.

For the example configuration above, create [server/graphql/schema.ts](server/graphql/schema.ts):

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

**Remote schemas** are introspected at build time from the endpoint URL and executed via an HTTP executor at runtime. Subscriptions are stripped from remote schemas.

The final schema is stitched from the all of the defined local / remote schemas.


### Define GraphQL context (optional)

Context definition is optional and factories resolve in order on the server. Their return types are merged into a single `GraphQLContext` type which is exported from `#graphql/context`. You can use the auto-imported `defineGraphQLContext` helper for type-safety.

For example, create [server/graphql/context.ts](server/graphql/context.ts):

```ts
import { getUserSession } from "nuxt-auth-utils";

export default defineGraphQLContext(async (event) => {
  const session = await getUserSession(event);
  return {
    user: session?.user ?? null,
  };
});
```


### Write GraphQL documents (.gql)

By default, the module scans `**/*.gql` files for **named operations** and **fragments** which are converted into **types** and **typed document nodes** in `#graphql/operations`. The operations are exposed by name in `#graphql/registry` to allow type-safe execution with the provided **composables** and **server utils**.

⚠️ Operation names are required and must be unique.

Example document files:

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
- Fragment types are re-exported from `#graphql/operations`.
- Fragments are not executable by themselves and are not part of the registry.

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

From TypeScript, you can also use fragment types explicitly when needed:

```ts
import type { TheFilmFragment } from "#graphql/operations";
```


### Use the auto-imported composables

The auto-imported composables allow executing queries, mutations, and subscriptions based on their registry name with full type-safety (variables and return value).

```ts
// Cached query via useAsyncData
const { data, pending, error, refresh } = await useAsyncGraphQLQuery("HelloWorld", undefined);

// Direct HTTP query (SafeResult)
const { data: queryData, error: queryError } = await useGraphQLQuery("HelloWorld");

// Mutation (SafeResult)
const { mutate, pending: mutationPending } = useGraphQLMutation("Ping");
const { data: mutationData, error: mutationError } = await mutate({ message: "Hello!" });

// Subscription (client-only, SSE)
const { data, error, start, stop } = useGraphQLSubscription("Time");
```


### Use the auto-imported server utils

In server routes, you can execute queries and mutations directly against the stitched schema (no HTTP roundtrip):

```ts
export default defineEventHandler(async (event) => {
  // Server-side GraphQL query example
  const { data: queryData, error: queryError } = await useGraphQLOperation(event, "HelloWorld" );

  // Server-side GraphQL mutation example
  const { data: mutationData } = await useGraphQLOperation(event, "Ping", { message: queryData?.hello ?? "Pong" },
  );

  return { queryData, mutationData, queryError };
});
```

Server helpers return a `GraphQLExecutionResult` in the same format as some composables, i.e. `{ data: TResult, error: null } | { data: null, error: NormalizedError }`


### Query caching (client-side only)

`useAsyncGraphQLQuery` can cache query results based on the global cache configuration and per-query overrides.

- In-flight requests are deduplicated (same operation + variables → one network call).
- In-memory cache uses Nuxt `useAsyncData`/`useNuxtData`.
- Persisted cache stores entries in localStorage for ttl seconds (0 = never expires).

#### Cache policies

- `"no-cache"`: always fetches from the network (still dedupes in-flight).
- `"cache-first"`: returns cached value when present, otherwise fetches.
- `"network-first"`: tries the network first, falls back to cached value on error.
- `"swr"`: returns cached value immediately and refreshes in the background.

#### Per-query overrides

```ts
const { data } = await useAsyncGraphQLQuery("HelloWorld", undefined, {
  cache: {
    policy: "network-first",
    ttl: undefined, // disable persistence for this call
  },
});
```

#### Manual invalidation

On the client, `useGraphQLCache()` can invalidate in-memory and persisted entries:

```ts
const { invalidate } = useGraphQLCache();

// Invalidate a single entry (operation + variables)
await invalidate({ operation: "HelloWorld", variables: {} });

// Invalidate all entries for an operation
await invalidate({ operation: "HelloWorld" });

// Invalidate all entries
await invalidate();
```


### Remote executor hooks (optional, per remote)

You can define custom logic around the remote executor for each remote schema by using the auto-imported `defineRemoteExecutorHooks` helper.

For the example configuration above, create [server/graphql/swapi-hooks.ts](server/graphql/swapi-hooks.ts):

```ts
import { defu } from "defu";

export default defineRemoteExecutorHooks({
  onRequest(request) {
    const { remoteAuthToken } = request.context || {};
    request.extensions = defu(request.extensions, {
      headers: {
        "XAuthorization": `Bearer ${remoteAuthToken || ""}`,
      },
    });
  },
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
