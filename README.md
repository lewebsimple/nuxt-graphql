# Nuxt GraphQL

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

Opinionated Nuxt module for using GraphQL Yoga on the server and urql as a client.

- ✨ [Release Notes](/CHANGELOG.md)
- 🏀 [Online playground](https://stackblitz.com/github/lewebsimple/nuxt-graphql?file=playground%2Fapp.vue)

## Features
- 🧘‍♂️ GraphQL Yoga server handler with user-provided schema / context

## Quick Setup

Install the module to your Nuxt application with one command:

```bash
npx nuxi module add @lewebsimple/nuxt-graphql
```

Define your GraphQL schema in `server/graphql/schema.ts`:

```ts
import { createSchema } from "graphql-yoga";
import type { GraphQLContext } from "./context";

export const schema = createSchema<GraphQLContext>({
  typeDefs: /* GraphQL */ `
      type Query {
        hello: String!
      }
    `,
  resolvers: {
    Query: {
      hello: () => "Hello world!",
    },
  },
});
```

Define your GraphQL context in `server/graphql/context.ts`:

```ts
import type { H3Event } from "h3";

export async function createContext(_event: H3Event) {
  return {
    foo: "bar",
  };
}

export type GraphQLContext = Awaited<ReturnType<typeof createContext>>;
```

That's it! You can now use Nuxt GraphQL in your Nuxt app ✨


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
