# Nuxt GraphQL – AI Guide

- **Purpose**: This repo is a Nuxt module wrapping GraphQL Yoga with `graphql-request`/`graphql-sse`, plus typed composables and cache helpers.

- **Module setup**: The module entry [src/module.ts](src/module.ts) wires the Yoga handler (fixed route `/api/graphql` via [src/runtime/server/yoga-handler.ts](src/runtime/server/yoga-handler.ts)), runtime aliases (`#graphql/schema`, `#graphql/context`, `#graphql/operations`, `#graphql/registry`, `#graphql/zod`), and injects the plugin/composables during `setup`. It logs endpoint readiness on `listen`.

- **Schema/context discovery**: By default expects `server/graphql/schema.ts` (must export `schema`) and optional `server/graphql/context.ts`; otherwise falls back to [src/runtime/server/graphql/default-context.ts](src/runtime/server/graphql/default-context.ts). Schema output defaults to `server/graphql/schema.graphql`.

- **Runtime clients**: Plugin [src/runtime/app/plugins/graphql.ts](src/runtime/app/plugins/graphql.ts) provides `$graphql` (HTTP) and `$graphqlSSE` (subscriptions). HTTP client forwards `cookie`/`authorization` headers on SSR and emits `graphql:error` hook via `wrapError` on failures.

- **Typed operations registry**: [src/helpers/codegen.ts](src/helpers/codegen.ts) scans `**/*.gql` (configurable) across layers, enforces unique/ named operations/fragments, and generates `#graphql/operations`, registry, and optional Zod schemas under `#graphql/zod`. Duplicate or unnamed operations throw during codegen.

- **Codegen lifecycle**: Runs on `prepare:types` and watches `.gql` during dev; also writes `.graphqlrc` for IDE support. Configure via `graphql.codegen` in `nuxt.config` (pattern, schemaOutput, scalars, custom generates). Scalars map to Zod schemas with coercion.

- **Composable patterns**: `useGraphQLQuery`/[src/runtime/app/composables/useGraphQLQuery.ts](src/runtime/app/composables/useGraphQLQuery.ts) uses registry names, wraps `useAsyncData`, and applies caching/deduplication. Mutations/subscriptions follow similar typed-name signatures via `useGraphQLMutation`/`useGraphQLSubscription`.

- **Caching + dedupe**: [src/runtime/app/utils/graphql-cache.ts](src/runtime/app/utils/graphql-cache.ts) provides per-operation cache (memory or localStorage) with TTL, in-flight dedupe, and `cacheInvalidate`/`registerRefresh` hooks. Cache is enabled by `runtimeConfig.public.graphql.cache` and composable `cache` option.

- **Server utilities**: [src/runtime/server/utils/graphql-client.ts](src/runtime/server/utils/graphql-client.ts) builds a per-request `GraphQLClient` with incoming headers and caches it on the H3 event context. Server-side composables live in `src/runtime/server/utils`.

- **Logging**: `helpers/logger.ts` adds colored output for codegen findings (operation/fragment names) and success/error messages.

- **Playground**: Example app under [playground](playground) uses local module build; schema lives in `playground/server/graphql`. Useful for manual testing.

- **Tests**: Vitest suite with e2e fixtures in [test/fixtures](test/fixtures) and unit tests under [test/unit](test/unit). E2E uses `@nuxt/test-utils` to spin up fixture apps.

- **Scripts (package.json)**: `pnpm install`; `pnpm run dev:prepare` (stub build + prepare + playground prepare); `pnpm run dev` (develop with playground); `pnpm run dev:build` (build playground); `pnpm run lint`; `pnpm run test|test:watch|test:coverage`; `pnpm run test:types`; `pnpm run prepack` (module build). Release flow: `pnpm run release` (lint, tests, prepack, changelog, publish).

- **Common pitfalls**: Ensure every `.gql` operation is named and unique; codegen fails otherwise. Schema output path must end with `.graphql` or a warning is logged. SSE subscriptions unavailable server-side (`import.meta.server` guard).

- **Extending codegen**: Pass `graphql.codegen.generates` for extra outputs; base generates already include TypedDocumentNode operations and optional Zod validation schemas.

- **Runtime config**: Public config exposes `graphql.endpoint` (always `/api/graphql`), `headers`, and cache defaults (enabled, ttl, storage). Only cache/headers are configurable in `nuxt.config` `graphql`.

- **GraphQL errors**: Wrap errors via [src/runtime/app/utils/graphql-error.ts](src/runtime/app/utils/graphql-error.ts); plugin emits `nuxtApp.callHook("graphql:error", wrappedError)` for consumers to react.

- **File operations helpers**: [src/helpers/file-operations.ts](src/helpers/file-operations.ts) finds schema/docs across layers and writes files only when changed to avoid rebuild loops.

- **Contribution notes**: Use pnpm; run `pnpm run dev:prepare` before hacking for generated stubs; keep generated `dist` out of edits (build on prepack/release only).

If anything here feels off or incomplete, tell me which section to refine.
