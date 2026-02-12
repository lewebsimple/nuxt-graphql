# Nuxt GraphQL Module — Copilot Instructions (v1)

These instructions describe the **architecture, invariants, and design rules** of the Nuxt GraphQL module.
They are intended to guide code generation, refactors, and reviews.

---

## High-level goal

Provide a **GraphQL Yoga endpoint** and **fully type-safe GraphQL helpers** generated at build time from:

1. GraphQL context factories
2. GraphQL schemas (local + remote)
3. GraphQL documents (`.gql`) → typed operations + registry

⚠️ Runtime code **never reads module options** (only runtime config injected at build time).

---

## Build-time sources of truth

### 1. GraphQL Context

Config:
```ts
config.graphql.yoga.context?: string[]
````

* Server-only modules
* Must export:

```ts
export default defineGraphQLContext(factory)
```

Factory signature:

```ts
(event: H3Event) => Record<string, unknown> | Promise<Record<string, unknown>>
```

Rules:

* Default empty context is always injected first
* Factories run **in order**
* Later keys override earlier ones
* Conflicting keys with incompatible types surface as TypeScript errors

### Generated module

```ts
#graphql/context
  export type GraphQLContext
  export function createContext(event: H3Event): Promise<GraphQLContext>
```

* `GraphQLContext` is the **intersection** of all factory return types
* `createContext` awaits all factories and merges via `Object.assign`

---

### 2. GraphQL Schemas

Config:

```ts
config.graphql.yoga.schemas: Record<string, SchemaDef>
```

#### Local schema

```ts
{
  type: "local"
  path: string // must live under server/
}
```

* Module must export a **named** `schema: GraphQLSchema` or use the provided helper:

```ts
export default defineLocalGraphQLSchema({ schema })
```

* Executed **directly on the schema** (no HTTP)

#### Remote schema

```ts
{
  type: "remote"
  url: string
  headers?: HeadersInput
  hooks?: string[] // server-only modules
}
```

* Remote schema introspection happens at build time (subscriptions are stripped)
* Execution uses GraphQL Tools HTTP executor
* Per-operation remote execution hooks only
* Hook modules should default-export `defineRemoteExecutorHooks({ ... })`

#### Conflict policy

* No custom prefixing or conflict resolution
* Schemas are stitched via `@graphql-tools/stitch`
* Avoid naming collisions (no explicit conflict guard)

---

### 3. GraphQL Documents

* Loaded from glob (default: `**/*.gql`)
* Ignored directories:
  * `.cache`
  * `.nuxt`
  * `.output`
  * `dist`
  * `node_modules`
* Only **named operations** are allowed (anonymous operations throw)
* Duplicate operation names throw at build time
* Documents are shared between app and server

---

## Runtime boundaries

### `#graphql/runtime/app`

* Client + SSR
* Uses `graphql-request`
* Never executes against schema
* SSR always uses HTTP
* Headers forwarded via:

```ts
config.graphql.client.ssrForwardHeaders?: string[]
```

Helpers:

* `useAsyncGraphQLQuery` (wraps `useAsyncData`)
* `useGraphQLQuery`
* `useGraphQLMutation`
* `useGraphQLSubscription` (client-only, SSE)

---

### `#graphql/runtime/server`

* Nitro-only
* Executes directly on the stitched schema
* Context derived from `event`
* No server-side caching in v1

Helpers:

```ts
useServerGraphQLQuery(event, operation, variables)
useServerGraphQLMutation(event, operation, variables)
```

---

### `#graphql/runtime/shared`

* Header utilities
* Cache helpers
* Error normalization
* No Nuxt- or Nitro-specific APIs

---

## Remote execution

### Executor

* Built on `@graphql-tools/executor-http`
* Wrapped by `createRemoteExecutor`

```ts
createRemoteExecutor({
  url,
  headers?,
  hooks
}) => Executor
```

### Remote execution hooks

```ts
interface GraphQLRemoteExecHooks {
  onRequest?(request: ExecutionRequest): void | Promise<void>
  onResult?(result: ExecutionResult): void | Promise<void>
  onError?(error: unknown): void | Promise<void>
}
```

Rules:

* Hooks are **per operation**
* No access to Nitro `event`
* No Yoga response mutation
* GraphQL execution errors are **data**, not thrown
* `onError` is only for transport / execution failures
* Request-specific headers can be injected via `request.extensions.headers`

---

## Headers

```ts
type HeadersInput = Record<string, string | null>
```

```ts
mergeHeaders(...inputs: (HeadersInput | undefined)[]): Headers
```

Rules:

* `string` → set / override
* `null` → unset
* later inputs win

---

## Error model (shared everywhere)

```ts
type SafeResult<T> =
  | { data: T; error: null }
  | { data: null; error: NormalizedError }
```

* Single error surface across app + server
* `error.code` is an enum (extensible via declaration merging)
* Original GraphQL errors are preserved in `NormalizedError.errors`
* Client/server helpers return `SafeResult`

---

## Client-side cache (v1)

Policies:

* `no-cache`
* `cache-first`
* `network-first`
* `swr` (stale-while-revalidate)

Config:

```ts
config.graphql.client.cache?: Partial<CacheConfig>
```

```ts
CacheConfig {
  policy
  ttl        // seconds; undefined = no persistence, 0 = never expires
  keyPrefix  // default: "gql"
  keyVersion // default: "1"
}
```

Storage:

* In-memory via `useNuxtData`
* Optional persistence via `unstorage` + `localStorage` (base: `nuxt-graphql:`)
* TTL-based (0 = never expires)

Helpers:

```ts
const cache = useGraphQLCache();

// Read cached query (in-memory only, sync)
cache.read(operation, variables?) → ResultOf<TName> | undefined

// Write cached query (in-memory only, sync)
cache.write(operation, variables, value | updater) → void

// Update cached query (in-memory + persisted, async)
cache.update(operation, variables, value | updater) → Promise<void>

// Invalidate cache entries (async)
cache.invalidate() → Promise<void>                     // all entries
cache.invalidate(operation) → Promise<void>            // all for operation
cache.invalidate(operation, variables) → Promise<void> // exact match
```

Cache key:

```
[prefix]:[version]:[operationName]:[varsHash]
```

---

## Subscriptions (v1)

* Client-only
* SSE via `graphql-sse`
* Separate SSE client plugin
* Same documents & types

---

## Generated artifacts (side effects)

* Stitched GraphQL SDL:

```ts
config.graphql.saveSDL?: string
// default: server/graphql/schema.graphql
```

* `graphql.config.json`:

```ts
config.graphql.saveConfig?: string
// contains { schema, documents }
```

---

## Virtual modules

Generated via `addTemplate` (optionally written to disk):

* `#graphql/context`
* `#graphql/schemas/*`
* `#graphql/schema`
* `#graphql/operations`
* `#graphql/registry`
* `#graphql/types`

---

## Non-goals (v1)

* Per-field remote hooks
* Server-side caching
* Server HTTP schema execution
* Runtime access to module options

---

## Core principles (must not be violated)

* Clear **build-time vs runtime** separation
* No `any` — use `unknown` + type guards
* Deterministic ordering everywhere
* Transport-agnostic executors
* One unified error model
