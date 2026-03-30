# Nuxt GraphQL

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

Opinionated Nuxt module that wires a typed GraphQL server + client into your app.

✨ [Release Notes](/CHANGELOG.md)

## Features

- 🧘 **GraphQL Yoga** server at `/api/graphql` (**GraphiQL** in dev) + **SSE subscriptions**
- 🪡 **Combined schema** from local and/or remote schemas (remote introspection at build time; subscriptions stripped)
- 🪄 Code generation from `.gql` documents and source files → **validated schema operations and fragments**
- 🧠 **Type-safe helpers** for **queries, mutations, and subscriptions** in both **client + server**
- 🧊 **SSR-friendly** by default: request header forwarding + remote schema execution hooks
- 🚀 **Client-side cache** for `useAsyncGraphQLQuery` (cache policies + optional persistence in localStorage)
- 🧯 **Unified error model** via `ExecuteGraphQLResult` and `NormalizedError`

## Getting started

Install the module and its dependencies in your project:

```bash
pnpm add @lewebsimple/nuxt-graphql @lewebsimple/graphql-codegen-zod graphql zod
```

### Configuration

Add the module to your `nuxt.config.ts` and declare your schemas, context, documents glob and optional client cache:

```ts
export default defineNuxtConfig({
  modules: ["@lewebsimple/nuxt-graphql"],
  graphql: {
    // GraphQL server configuration
    server: {
      // Optional: custom GraphQL context factories (defaults to empty context)
      context: ["server/graphql/context.ts"],

      // Schemas to stitch together (local and/or remote)
      schema: [
        // Local schema example
        { type: "local", path: "server/graphql/schema.ts" },

        // Remote schema example
        {
          type: "remote",
          url: "https://swapi-graphql.netlify.app/graphql",
          // Optional: static headers for this remote
          headers: {
            "X-Static-Header": "static-header-value",
          },
          // Optional: per-remote execution hooks
          hooks: ["server/graphql/swapi-hooks.ts"],
        },
      ],
    },

    // GraphQL client configuration
    client: {
      // Optional: documents globs (defaults to **/*.gql)
      documents: ["**/*.gql"],

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

    // Optional: save path for the stitched SDL (defaults to ".nuxt/graphql/schema.graphql")
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

The final schema combines the all of the defined local / remote schemas.

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

By default, the module scans `**/*.gql` files for **named operations** and **fragments** which are converted into **types** and **typed document nodes**. The operations are exposed by name in `#graphql/registry` to allow type-safe execution with the provided **composables** and **server utils**.

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

From TypeScript, you can also use fragment types explicitly when needed (see below):

```ts
import type { TheFilmFragment, SwapiFilmsVariables } from "#graphql/types";
```

⚠️ These types are inferred from the Zod schemas and cannot be used as top-level in component props, i.e. `defineProps<TheFilmFragment>()` breaks but `defineProps<{ film: TheFilmFragment }>()` works just fine.

### Use the auto-imported composables

The auto-imported composables allow executing queries, mutations, and subscriptions based on their registry name with full type-safety (variables and return value).

```ts
// Cached query via useAsyncData
const { data, pending, error, refresh } = await useAsyncGraphQLQuery("HelloWorld", {});

// Direct HTTP query (SafeResult)
const { data: queryData, error: queryError } = await useGraphQLQuery("HelloWorld", {});

// Mutation (SafeResult)
const { mutate, pending: mutationPending } = useGraphQLMutation("Ping");
const { data: mutationData, error: mutationError } = await mutate({ message: "Hello!" });

// Subscription (client-only, SSE)
const { data, error, start, stop } = useGraphQLSubscription("Time", {});
```

### Use the auto-imported server utils

In server routes, you can execute queries and mutations directly against the stitched schema (no HTTP roundtrip):

```ts
export default defineEventHandler(async (event) => {
  // Server-side GraphQL query example
  const { data, error } = await executeSchemaOperation(event, "HelloWorld", {});

  return { data, error };
});
```

Server helpers return a `ExecuteGraphQLResult` in the same format as some composables, i.e. `{ data: TResult, error: null } | { data: null, error: NormalizedError }`

### Type-safety

All enum, fragment and operation variables & result types are re-exported from `#graphql/types` for your convenience:

```ts
import type { TheFilmFragment } from "#graphql/types";
```

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
const { data } = await useAsyncGraphQLQuery(
  "HelloWorld",
  {},
  {
    cache: {
      policy: "network-first",
      ttl: undefined, // disable persistence for this call
    },
  },
);
```

#### Cache manipulation

On the client, `useGraphQLCache()` provides helpers to read, write, update, and invalidate cache entries:

```ts
const cache = useGraphQLCache();

// Read cached query (in-memory only)
const films = cache.read("AllFilms", {});

// Write cached query synchronously (in-memory only, useful for rollbacks)
cache.write("AllFilms", {}, newValue);
cache.write("AllFilms", {}, (current) => ({ ...current, films: [...current.films, newFilm] }));

// Update cached query asynchronously (in-memory + persisted)
await cache.update("AllFilms", {}, newValue);
await cache.update("AllFilms", {}, (current) => ({
  ...current,
  films: [...current.films, newFilm],
}));

// Invalidate cache entries
await cache.invalidate("HelloWorld"); // All entries for operation
await cache.invalidate(); // All entries
```

#### Optimistic updates

`useGraphQLMutation` supports optimistic updates via lifecycle hooks:

```ts
const { mutate } = useGraphQLMutation("AddFilm", {
  onMutate: async (variables) => {
    const cache = useGraphQLCache();

    // Snapshot current value for rollback
    const snapshot = cache.read("AllFilms", {});

    // Optimistically update cache
    await cache.update("AllFilms", {}, (current) => ({
      films: [...(current?.films ?? []), { id: "temp", title: variables.title }],
    }));

    return { snapshot };
  },

  onError: (error, variables, context) => {
    const cache = useGraphQLCache();
    // Rollback on error (sync for instant UI update)
    if (context?.snapshot) {
      cache.write("AllFilms", {}, context.snapshot);
    }
  },

  onSuccess: (data, variables, context) => {
    // Replace optimistic temp ID with real ID from server
    const cache = useGraphQLCache();
    cache.update("AllFilms", {}, (current) => ({
      films: current?.films.map((f) => (f.id === "temp" ? data.addFilm : f)) ?? [],
    }));
  },

  onSettled: (result, variables, context) => {
    // Always runs after mutation (success or error)
    console.log("Mutation completed");
  },
});

const result = await mutate({ title: "New Film" });
```

### Remote executor hooks (optional, per remote)

You can define custom logic around the remote executor for each remote schema by using the auto-imported `defineRemoteExecutorHooks` helper.

All hooks receive the GraphQL context as a second parameter for convenient access.

For the example configuration above, create [server/graphql/swapi-hooks.ts](server/graphql/swapi-hooks.ts):

```ts
import { defu } from "defu";

export default defineRemoteExecutorHooks({
  onRequest(request, context) {
    // Context is available as second parameter
    const { remoteAuthToken } = context || {};
    request.extensions = defu(request.extensions, {
      headers: {
        Authorization: `Bearer ${remoteAuthToken || ""}`,
      },
    });
  },

  onResult(result, context) {
    // You can also access context in onResult
    console.log("User from context:", context?.user);
    console.log("Result:", result.data);
  },

  onError(error, context) {
    // And in onError for logging/monitoring
    console.error("Remote execution failed for user:", context?.user?.id);
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
