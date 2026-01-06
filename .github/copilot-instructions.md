# Nuxt GraphQL – AI Guide

- **Purpose**: Nuxt module bundling GraphQL Yoga + `graphql-request`/`graphql-sse`, typed composables, cache helpers, and codegen wiring.

- **Module wiring**: [src/module.ts](src/module.ts) registers the Yoga handler at `/api/graphql` ([src/runtime/server/yoga-handler.ts](src/runtime/server/yoga-handler.ts)), injects aliases (`#graphql/schema`, `#graphql/context`, `#graphql/operations`, `#graphql/registry`, `#graphql/zod`), adds app/server imports, and logs readiness on `listen`.

- **Schema/context discovery**: Finds `server/graphql/schema.ts` (must export `schema`) and optional `server/graphql/context.ts`; falls back to [src/runtime/server/lib/default-context.ts](src/runtime/server/lib/default-context.ts). Schema SDL is printed to `graphql.codegen.schemaOutput` (default `server/graphql/schema.graphql`, warning if not `.graphql`).

- **Yoga handler**: [src/runtime/server/api/graphql-handler.ts](src/runtime/server/api/graphql-handler.ts) converts H3 requests, builds context via `createContext`, and delegates to Yoga from [src/runtime/server/lib/create-yoga.ts](src/runtime/server/lib/create-yoga.ts) (GraphiQL in non-prod, SSE subscriptions enabled, endpoint from [src/runtime/server/lib/constants.ts](src/runtime/server/lib/constants.ts)).

- **Codegen flow**: [src/helpers/codegen.ts](src/helpers/codegen.ts) loads schema via Jiti, scans `graphql.codegen.pattern` (`**/*.gql` default) across layers, errors on unnamed/duplicate operations or fragments, logs per-file definitions, and generates TypedDocumentNodes + registry + optional Zod schemas into `buildDir/graphql`. Writes `.graphqlrc` with schema/documents and custom scalar mappings.

- **Codegen triggers**: Runs on `prepare:types`; in dev, `builder:watch` regenerates on `.gql` changes. Generated files are pushed into type references when present.

- **Registry shape**: `generateRegistryByTypeSource` emits `queries/mutations/subscriptions` maps keyed by operation name plus helper types `ResultOf`/`VariablesOf`; composables consume these names directly (no stringly-typed documents needed).

- **Runtime plugin**: [src/runtime/app/plugins/graphql.ts](src/runtime/app/plugins/graphql.ts) provides `$graphql` (GraphQLClient) and `$graphqlSSE` (singleton SSE client). SSR requests forward `cookie`/`authorization` headers; errors fire `graphql:error` hook via [src/runtime/app/utils/graphql-error.ts](src/runtime/app/utils/graphql-error.ts). SSE is client-only.

- **Composable patterns**: [src/runtime/app/composables/useGraphQLQuery.ts](src/runtime/app/composables/useGraphQLQuery.ts) wraps `useAsyncData`, accepts registry name + typed vars, and supports custom headers. Caching/dedupe use [src/runtime/app/utils/graphql-cache.ts](src/runtime/app/utils/graphql-cache.ts); `registerRefresh` pairs with `cacheInvalidate` for refresh-on-invalidate.

- **Mutations/subscriptions**: [src/runtime/app/composables/useGraphQLMutation.ts](src/runtime/app/composables/useGraphQLMutation.ts) returns `{ mutate, pending }` with wrapped errors. [src/runtime/app/composables/useGraphQLSubscription.ts](src/runtime/app/composables/useGraphQLSubscription.ts) streams via SSE (`start/stop`, auto-start client-side) and wraps GraphQL errors.

- **Cache config**: Public runtime config (`runtimeConfig.public.graphql`) exposes `endpoint`, `headers`, and cache defaults (`enabled`, `ttl`, `storage` = memory|localStorage). Cache is off by default unless enabled via module options; per-call `cache: false` disables for a query.

- **Server utilities**: [src/runtime/server/utils/graphql-client.ts](src/runtime/server/utils/graphql-client.ts) builds/caches a request-scoped GraphQLClient using incoming headers. Server-side utilities live under `src/runtime/server/utils` and are auto-imported.

- **Logging**: [src/helpers/logger.ts](src/helpers/logger.ts) provides colored info/success/error logs for codegen (per-file operation summaries) and schema writes.

- **Playground**: [playground](playground) uses the local module build with schema/context under `playground/server/graphql`; handy for manual GraphiQL and composable testing.

- **Tests**: Vitest E2E fixtures in [test/fixtures](test/fixtures) exercised by [test/basic.test.ts](test/basic.test.ts) and [test/hooks.test.ts](test/hooks.test.ts); unit tests under [test/unit](test/unit). E2E boot via `@nuxt/test-utils`.

- **Scripts (pnpm)**: `pnpm run dev:prepare` (generate stubs/build module), `pnpm run dev` (develop with playground), `pnpm run dev:build` (build playground), `pnpm run lint`, `pnpm run test|test:watch|test:coverage`, `pnpm run test:types`, `pnpm run prepack` (module build), `pnpm run release` (lint/tests/prepack/changelog/publish).

- **Gotchas**: Every `.gql` operation must be named/unique; codegen errors otherwise. SSE subscriptions throw on server use. Schema output not ending in `.graphql` only logs a warning. Cache only works client-side and requires `runtimeConfig.public.graphql.cache.enabled`.

- **File ops**: [src/helpers/file-operations.ts](src/helpers/file-operations.ts) locates schema/docs across layers and only writes when content changes to avoid watch loops.

- **Contribution nudge**: Use pnpm, run `pnpm run dev:prepare` before hacking (ensures generated stubs), and avoid editing built `dist` artifacts.

If anything here feels off or incomplete, tell me which section to refine.
