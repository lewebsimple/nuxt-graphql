# Nuxt GraphQL Review Playbook

## Public API

- **Module Options**: `ModuleOptions` with sensible defaults, defined in [src/module.ts](src/module.ts).
	- `endpoint?: string` (default: `"/api/graphql"`)
	- `codegen?: { enabled?: boolean; pattern?: string; schemaOutput?: string }`
		- Defaults: `enabled: true`, `pattern: "**/*.gql"`, `schemaOutput: "server/graphql/schema.graphql"`.
- **Runtime Config**: `public.graphql.endpoint` set during `setup()` in [src/module.ts](src/module.ts).
- **Type Augmentation**: Public runtime config and app injection types in [src/types/graphql-client.d.ts](src/types/graphql-client.d.ts).
- **Injected Plugin**: `$graphql: GraphQLClient` provided by [src/runtime/plugins/graphql.ts](src/runtime/plugins/graphql.ts).
- **Auto‑imported Composables**:
	- `useGraphQL()` → wraps `$graphql.request` for `TypedDocumentNode`. See [src/runtime/composables/useGraphQL.ts](src/runtime/composables/useGraphQL.ts).
	- `useGraphQLQuery(name, variables?, opts?)` → `useAsyncData` over registry entry. See [src/runtime/composables/useGraphQLQuery.ts](src/runtime/composables/useGraphQLQuery.ts).
	- `useGraphQLMutation(name)` → returns `{ mutate, data, error, pending }`. See [src/runtime/composables/useGraphQLMutation.ts](src/runtime/composables/useGraphQLMutation.ts).
- **Server Route**: GraphQL Yoga handler registered at `endpoint` (default `"/api/graphql"`). Added via `addServerHandler({ route: endpoint, handler: "graphql/yoga-handler" })` in [src/module.ts](src/module.ts). Template at [src/templates/yoga-handler.mjs](src/templates/yoga-handler.mjs).
- **Schema/Context Resolution**:
	- Nitro aliases via `nitro:config` in [src/module.ts](src/module.ts):
		- `#graphql/schema` → first match of `server/graphql/schema.{ts,mjs}` (required).
		- `#graphql/context` → `server/graphql/context.{ts,mjs}` or fallback to [src/server/default-context.ts](src/server/default-context.ts).
- **Codegen & Registry**:
	- Aliases added in [src/module.ts](src/module.ts):
		- `#graphql/operations` → `$buildDir/graphql/operations.ts` (generated).
		- `#graphql/registry` → `$buildDir/graphql/registry.ts` (generated).
	- Registry types (e.g., `QueryName`, `QueryResult<N>`, `QueryVariables<N>`) generated in [src/utils/codegen.ts](src/utils/codegen.ts) by `generateRegistryByTypeSource`.
- **Exports & Types**: See [package.json](package.json) exports: `types: ./dist/types.d.mts`, `import: ./dist/module.mjs`. Default export is the module; `ModuleOptions` included in generated types.
- **Hooks**: `nitro:config`, `listen`, `prepare:types`, `builder:watch`, `addImportsDir`, `addPlugin`, `addTypeTemplate` used in [src/module.ts](src/module.ts).

## Architecture Map

- **Module Entry & Hooks**: `defineNuxtModule<ModuleOptions>(...)` in [src/module.ts](src/module.ts).
	- Registers aliases, templates, server handler, types, composable auto‑imports, and codegen hooks.
- **Yoga Server Creation**: Template [src/templates/yoga-handler.mjs](src/templates/yoga-handler.mjs) creates a singleton via `createYoga({ schema, graphqlEndpoint, fetchAPI: globalThis })`.
	- H3 integration: `toWebRequest(event)` and `sendWebResponse(event, response)`.
	- Context: `const context = await createContext(event)` from `#graphql/context` (user‑provided or default).
- **GraphQL Client (SSR‑aware)**: [src/runtime/plugins/graphql.ts](src/runtime/plugins/graphql.ts) builds `GraphQLClient` using `useRequestURL().origin + config.public.graphql.endpoint`.
	- No custom headers or per‑request cookie/authorization propagation.
- **Shared Types/Config**: Operation documents compiled into `#graphql/operations`; registry generated as `#graphql/registry` with strong types.
- **Dev vs Build**:
	- `prepare:types`: generates operations/registry once; pushes references for type availability.
	- `builder:watch`: watches `*.gql` across layers in dev; regenerates on change.
	- Yoga singleton per Nitro worker; server schema HMR depends on Nitro reloads.

## Review Guardrails

- **SSR/Edge Compatibility**:
	- Server uses H3 Web APIs and Yoga defaults; verify Nitro preset supplies required Web APIs.
	- Client SSR calls HTTP to same origin; no header/cookie forwarding by default.
- **Request Lifecycle**:
	- Auth headers/cookies not propagated in [src/runtime/plugins/graphql.ts](src/runtime/plugins/graphql.ts). If SSR GraphQL needs auth, adjust client creation.
- **Security**:
	- Introspection/CORS/CSRF use Yoga defaults (no overrides). Consider environment‑based toggles.
	- No depth/complexity limits, persisted queries, or explicit error masking.
- **Performance**:
	- Schema built once per worker; context per request.
	- No result caching at module level; `useGraphQLQuery` relies on `useAsyncData` keys (name + variables hash).
	- Codegen errors logged via [src/utils/logger.ts](src/utils/logger.ts).
- **DX**:
	- Strongly typed composables via registry; runtime config augmented.
	- Analyzer errors for unnamed/duplicate ops/fragments in [src/utils/codegen.ts](src/utils/codegen.ts).
	- Server start logs endpoint; codegen logs documents/outputs.
- **Semver**:
	- Breaking changes include renaming composables, changing `public.graphql.endpoint` shape, altering registry types, or changing `$graphql` provide key.
	- Add deprecation guards before altering option shapes.
- **Testing**:
	- Should cover route existence/response, schema/context aliasing, codegen success/failure, SSR `$graphql` usage, typed composables.
	- Current tests: basic SSR render in [test/basic.test.ts](test/basic.test.ts); expand coverage.

## Compatibility & Packaging

- **Supported Versions** (from repo state):
	- Nuxt/Nitro: `nuxt: ^4.2.2`, `@nuxt/kit: ^4.2.2` in [package.json](package.json).
	- Yoga: `graphql-yoga: ^5.17.1`.
	- Client: `graphql-request: ^7.4.0`.
	- GraphQL: `^16.12.0`.
- **Build Output / Exports / Types**: ESM‑only (`"type": "module"`); exports map configured in [package.json](package.json). Templates copied via [build.config.ts](build.config.ts).
- **Dependencies**: `graphql`, `graphql-request`, `graphql-yoga` as regular dependencies (not peers). `@nuxt/kit` is a dependency (typical for modules built with `@nuxt/module-builder`).

## PR Review Checklist

- **Files To Check First**:
	- [src/module.ts](src/module.ts): options, hooks, aliases, endpoints, codegen behavior.
	- [src/templates/yoga-handler.mjs](src/templates/yoga-handler.mjs): server behavior, CORS/introspection, context wiring.
	- [src/runtime/plugins/graphql.ts](src/runtime/plugins/graphql.ts): client creation and SSR behavior.
	- [src/runtime/composables/*](src/runtime/composables): composable APIs and types.
	- [src/utils/codegen.ts](src/utils/codegen.ts): analyzer strictness, registry format, codegen config.
	- [package.json](package.json): exports map, deps, Nuxt versions.
- **Questions For Authors**:
	- Does this change alter the `ModuleOptions` shape or defaults?
	- Does it change `public.graphql.endpoint` or how `$graphql` is provided?
	- Does SSR require headers/cookies propagation? If yes, how is it handled?
	- Does it affect codegen outputs (`#graphql/operations` / `#graphql/registry`) shape or names?
	- Does it change the Yoga handler behavior (CORS, introspection, context)?
- **Tests/CI To Run**:
	- Add tests for GraphQL route responding and using schema in fixture.
	- Add codegen tests: unnamed op/duplicate name errors.
	- Add SSR `$graphql` usage test (client‑only and SSR paths).
	- If codegen/composables changed, run type tests and playground typecheck.
- **Merge Blockers (Red Flags)**:
	- Breaking option names/defaults or runtime injected keys without deprecation.
	- Removing/renaming composables or changing their return shapes.
	- Altering alias contracts (`#graphql/*`) without migration docs.
	- Introducing client defaults that break SSR (e.g., absolute URLs, missing origin) or edge presets without validation.
	- Weakening analyzer strictness (allowing unnamed/duplicate ops) without opt‑in config.
- **Repo Spots To Scan For New PRs**:
	- [README.md](README.md) for documented API that must continue to work.
	- [src/module.ts](src/module.ts) for option surface.
	- [src/runtime/**](src/runtime) for runtime plugin/composables.
	- [test/fixtures/basic](test/fixtures/basic) for usage patterns.
