# Changelog

## v0.7.7

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.7.6...v0.7.7)

### 🩹 Fixes

- Generate on prepare because typecheck needs it ([d62038f](https://github.com/lewebsimple/nuxt-graphql/commit/d62038f))

### 🏡 Chore

- **release:** V0.7.6 ([5be5ed1](https://github.com/lewebsimple/nuxt-graphql/commit/5be5ed1))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.7.6

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.7.5...v0.7.6)

### 🩹 Fixes

- Proper context type for defineRemoteExecutorHooks ([a841b81](https://github.com/lewebsimple/nuxt-graphql/commit/a841b81))

### 🏡 Chore

- **release:** V0.7.5 ([fc55141](https://github.com/lewebsimple/nuxt-graphql/commit/fc55141))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.7.5

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.7.4...v0.7.5)

### 🩹 Fixes

- Update graphql-codegen-zod v0.2.1 to strip directives from documents ([48b9d60](https://github.com/lewebsimple/nuxt-graphql/commit/48b9d60))

### 🏡 Chore

- **release:** V0.7.4 ([9da9dbb](https://github.com/lewebsimple/nuxt-graphql/commit/9da9dbb))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.7.4

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.7.3...v0.7.4)

### 🚀 Enhancements

- Prevent duplicate fragments false positives by tightening documents loading ([2ccb45a](https://github.com/lewebsimple/nuxt-graphql/commit/2ccb45a))

### 🩹 Fixes

- Prevent generation-only directives from reaching runtime schema ([92abb80](https://github.com/lewebsimple/nuxt-graphql/commit/92abb80))

### 🏡 Chore

- **release:** V0.7.3 ([3fd7863](https://github.com/lewebsimple/nuxt-graphql/commit/3fd7863))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.7.3

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.7.2...v0.7.3)

### 🩹 Fixes

- Configure unknown ZodValue scalar ([0e44ade](https://github.com/lewebsimple/nuxt-graphql/commit/0e44ade))

### 🏡 Chore

- **release:** V0.7.2 ([a1c5af1](https://github.com/lewebsimple/nuxt-graphql/commit/a1c5af1))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.7.2

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.7.1...v0.7.2)

### 🩹 Fixes

- Extend schema used for SDL with Zod directives ([ef5647f](https://github.com/lewebsimple/nuxt-graphql/commit/ef5647f))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.7.1

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.7.0...v0.7.1)

### 🚀 Enhancements

- Update to graphql-codegen-zod 0.2.0 with better directives ([9d62794](https://github.com/lewebsimple/nuxt-graphql/commit/9d62794))

### 🩹 Fixes

- Stitch single remote schema ([7bd0b41](https://github.com/lewebsimple/nuxt-graphql/commit/7bd0b41))
- Adjust tests ([562e8c7](https://github.com/lewebsimple/nuxt-graphql/commit/562e8c7))

### 🏡 Chore

- Update deps ([a5c4a17](https://github.com/lewebsimple/nuxt-graphql/commit/a5c4a17))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.7.0

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.6.20...v0.7.0)

### 🩹 Fixes

- Write registry templates using addCompiledTemplate ([8cfeea9](https://github.com/lewebsimple/nuxt-graphql/commit/8cfeea9))
- Tests ([0e2c3de](https://github.com/lewebsimple/nuxt-graphql/commit/0e2c3de))

### 💅 Refactors

- ⚠️  Complete rewrite using @lewebsimple/graphql-codegen-zod ([ee0414d](https://github.com/lewebsimple/nuxt-graphql/commit/ee0414d))

### 🏡 Chore

- Updete deps ([01a9bf6](https://github.com/lewebsimple/nuxt-graphql/commit/01a9bf6))

#### ⚠️ Breaking Changes

- ⚠️  Complete rewrite using @lewebsimple/graphql-codegen-zod ([ee0414d](https://github.com/lewebsimple/nuxt-graphql/commit/ee0414d))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.6.20

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.6.19...v0.6.20)

### 🩹 Fixes

- Type issue with useAsyncGraphQLQuery ([48d7a40](https://github.com/lewebsimple/nuxt-graphql/commit/48d7a40))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.6.19

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.6.18...v0.6.19)

### 🚀 Enhancements

- Forget cache keys on invalidation to prevent memory leak ([b4ccec5](https://github.com/lewebsimple/nuxt-graphql/commit/b4ccec5))

### 🩹 Fixes

- Type issue with useAsyncGraphQLQuery ([60009e2](https://github.com/lewebsimple/nuxt-graphql/commit/60009e2))

### 💅 Refactors

- Cache scope is now required (defaults to "global") ([d92e842](https://github.com/lewebsimple/nuxt-graphql/commit/d92e842))

### 🏡 Chore

- Update deps ([1aa2970](https://github.com/lewebsimple/nuxt-graphql/commit/1aa2970))
- Eslint settings for VSCode ([8778523](https://github.com/lewebsimple/nuxt-graphql/commit/8778523))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.6.18

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.6.17...v0.6.18)

### 🚀 Enhancements

- Enhance cache management with new cache key registration and invalidation methods ([d05c61c](https://github.com/lewebsimple/nuxt-graphql/commit/d05c61c))

### 🩹 Fixes

- Register cache key in useAsyncGraphQLQuery and add warning for missing cache keys in useGraphQLCache ([d12d218](https://github.com/lewebsimple/nuxt-graphql/commit/d12d218))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.6.17

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.6.16...v0.6.17)

### 🩹 Fixes

- Change enumsAsTypes to enumsAsConst in operations template ([350cc70](https://github.com/lewebsimple/nuxt-graphql/commit/350cc70))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.6.16

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.6.15...v0.6.16)

### 🚀 Enhancements

- Explicitly pass GraphQL context to remote executor hooks ([84a1428](https://github.com/lewebsimple/nuxt-graphql/commit/84a1428))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.6.15

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.6.14...v0.6.15)

### 🩹 Fixes

- UseGraphQLLoadMore Maybe<T> null handling ([19b5bb8](https://github.com/lewebsimple/nuxt-graphql/commit/19b5bb8))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.6.14

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.6.12...v0.6.14)

### 🩹 Fixes

- Default maybeValue config T ([ null](https://github.com/lewebsimple/nuxt-graphql/commit/ null))

### ❤️ Contributors

- 073fa09 <Pascal Martineau>

## v0.6.12

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.6.11...v0.6.12)

### 🚀 Enhancements

- Cache manipulation helpers (read, write, update, invalidate) ([b0b1b72](https://github.com/lewebsimple/nuxt-graphql/commit/b0b1b72))
- Optimistic updates in useGraphQLMutation ([4342757](https://github.com/lewebsimple/nuxt-graphql/commit/4342757))

### 🩹 Fixes

- Test needs dev: true ([9c12f06](https://github.com/lewebsimple/nuxt-graphql/commit/9c12f06))

### 🏡 Chore

- Update README and deps ([c51adb1](https://github.com/lewebsimple/nuxt-graphql/commit/c51adb1))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.6.11

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.6.10...v0.6.11)

### 🚀 Enhancements

- Include response headers in GraphQLExecutionResult ([75f55db](https://github.com/lewebsimple/nuxt-graphql/commit/75f55db))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.6.10

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.6.9...v0.6.10)

### 🩹 Fixes

- EndCursor should be string ([ undefined](https://github.com/lewebsimple/nuxt-graphql/commit/ undefined))

### ❤️ Contributors

- Ba5917b <Pascal Martineau>

## v0.6.9

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.6.8...v0.6.9)

### 🚀 Enhancements

- Disable avoidOptionals for input / default value ([92ff58b](https://github.com/lewebsimple/nuxt-graphql/commit/92ff58b))
- UseGraphQLLoadMore ([4652ff1](https://github.com/lewebsimple/nuxt-graphql/commit/4652ff1))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.6.8

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.6.7...v0.6.8)

### 🩹 Fixes

- UseAsyncGraphQL null => undefined ([fa92254](https://github.com/lewebsimple/nuxt-graphql/commit/fa92254))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.6.7

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.6.6...v0.6.7)

### 🩹 Fixes

- Normalize unknown error as JSON.stringify() instead of String() ([42f7d2a](https://github.com/lewebsimple/nuxt-graphql/commit/42f7d2a))
- UseAsyncGraphQLQuery error typed as NormalizedError ([4d43dee](https://github.com/lewebsimple/nuxt-graphql/commit/4d43dee))
- Let Yoga handle its own error response ([838409b](https://github.com/lewebsimple/nuxt-graphql/commit/838409b))
- Type yoga instance with GraphQLContext for better type safety ([1a544ed](https://github.com/lewebsimple/nuxt-graphql/commit/1a544ed))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.6.6

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.6.5...v0.6.6)

### 🩹 Fixes

- Auto-import shared/utils from server routes ([1357f67](https://github.com/lewebsimple/nuxt-graphql/commit/1357f67))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.6.5

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.6.4...v0.6.5)

### 🩹 Fixes

- Update maybeValue type from "T ([ null" to "T ](https://github.com/lewebsimple/nuxt-graphql/commit/ null" to "T ))

### ❤️ Contributors

-  Undefined" In Operations Template <9c8176b>

## v0.6.4

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.6.3...v0.6.4)

### 🚀 Enhancements

- Disable immutableTypes in generated operations ([cd4fdac](https://github.com/lewebsimple/nuxt-graphql/commit/cd4fdac))
- Enhance useAsyncGraphQLQuery to support transformation of query results ([90a849d](https://github.com/lewebsimple/nuxt-graphql/commit/90a849d))

### 🩹 Fixes

- Typo in repository ([c1b4434](https://github.com/lewebsimple/nuxt-graphql/commit/c1b4434))
- Move CacheConfig type in shared/lib/types.ts ([ffe9238](https://github.com/lewebsimple/nuxt-graphql/commit/ffe9238))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.6.3

[compare changes](https://undefined/undefined/compare/v0.6.2...v0.6.3)

## v0.6.2

[compare changes](https://undefined/undefined/compare/v0.6.1...v0.6.2)

### 🩹 Fixes

- Encode SDL using JSON.stringify (d489881)

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.6.1

[compare changes](https://undefined/undefined/compare/v0.6.0...v0.6.1)

### 🩹 Fixes

- Disable graphqiql in prod (d636375)
- Typed request.context in remote executor hooks (1fe886b)

### 🏡 Chore

- Update README (9cc77bd)

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.6.0

[compare changes](https://undefined/undefined/compare/v0.5.13...v0.6.0)

### 💅 Refactors

- ⚠️  Fix execution in non-node environments (f7c80f7)

#### ⚠️ Breaking Changes

- ⚠️  Fix execution in non-node environments (f7c80f7)

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.5.13

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.5.12...v0.5.13)

### 🚀 Enhancements

- Save sdl / graphql config in dev mode onle ([bfc1993](https://github.com/lewebsimple/nuxt-graphql/commit/bfc1993))

### 🩹 Fixes

- Templates as .ts / .mjs / .d.ts ([d227b69](https://github.com/lewebsimple/nuxt-graphql/commit/d227b69))
- Remote executor headers / hooks ([a01b7a3](https://github.com/lewebsimple/nuxt-graphql/commit/a01b7a3))

### 🏡 Chore

- Update deps ([4b0a458](https://github.com/lewebsimple/nuxt-graphql/commit/4b0a458))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.5.12

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.5.11...v0.5.12)

### 🩹 Fixes

- Missing registry alias ([99397a5](https://github.com/lewebsimple/nuxt-graphql/commit/99397a5))
- Remove-executor's headers input ([76b954f](https://github.com/lewebsimple/nuxt-graphql/commit/76b954f))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.5.11

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.5.10...v0.5.11)

### 🚀 Enhancements

- Save SDL in dev only ([f3ec340](https://github.com/lewebsimple/nuxt-graphql/commit/f3ec340))

### 🩹 Fixes

- Edge-case with IsEmptyObject type ([3705a43](https://github.com/lewebsimple/nuxt-graphql/commit/3705a43))
- Docblock for spread arguments ([3e6458b](https://github.com/lewebsimple/nuxt-graphql/commit/3e6458b))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.5.10

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.5.9...v0.5.10)

### 🚀 Enhancements

- Warn on document loading error ([795fb5f](https://github.com/lewebsimple/nuxt-graphql/commit/795fb5f))

### 🩹 Fixes

- #graphql/operations export const documents instead of type ([8a65929](https://github.com/lewebsimple/nuxt-graphql/commit/8a65929))
- Update README.md concerning fragments types ([71693f3](https://github.com/lewebsimple/nuxt-graphql/commit/71693f3))
- Typo in generated types ([dc3d2a2](https://github.com/lewebsimple/nuxt-graphql/commit/dc3d2a2))
- Module graphql.config.json ([a7f9192](https://github.com/lewebsimple/nuxt-graphql/commit/a7f9192))
- .gql file watcher rebuils documents / operations / registry ([6430b2b](https://github.com/lewebsimple/nuxt-graphql/commit/6430b2b))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.5.9

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.5.8...v0.5.9)

### 🩹 Fixes

- Proper context export from #graphql/context with defineGraphQLContext ([60e7dfa](https://github.com/lewebsimple/nuxt-graphql/commit/60e7dfa))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.5.8

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.5.7...v0.5.8)

### 🩹 Fixes

- Context types template ([a9d38ec](https://github.com/lewebsimple/nuxt-graphql/commit/a9d38ec))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.5.7

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.5.6...v0.5.7)

### 🩹 Fixes

- DefineGraphQLContext should export { createContext } ([27d5106](https://github.com/lewebsimple/nuxt-graphql/commit/27d5106))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.5.6

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.5.5...v0.5.6)

### 💅 Refactors

- Operations / registry .mjs + .d.ts ([2fd7237](https://github.com/lewebsimple/nuxt-graphql/commit/2fd7237))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.5.5

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.5.4...v0.5.5)

### 🩹 Fixes

- Registry template typo ([e6c55c0](https://github.com/lewebsimple/nuxt-graphql/commit/e6c55c0))
- #graphql/context types generation ([8441b33](https://github.com/lewebsimple/nuxt-graphql/commit/8441b33))
- Generated schema types ([2ed77ce](https://github.com/lewebsimple/nuxt-graphql/commit/2ed77ce))

### 💅 Refactors

- Better type generation, documents / schemas caching and mjs runtime ([fe5f4f1](https://github.com/lewebsimple/nuxt-graphql/commit/fe5f4f1))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.5.4

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.5.3...v0.5.4)

### 🩹 Fixes

- Inline default context ([6871012](https://github.com/lewebsimple/nuxt-graphql/commit/6871012))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.5.3

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.5.2...v0.5.3)

### 🩹 Fixes

- Typo in GraphQL Yoga ready message ([80bea8e](https://github.com/lewebsimple/nuxt-graphql/commit/80bea8e))
- App / server / shared types generation ([eeba7a3](https://github.com/lewebsimple/nuxt-graphql/commit/eeba7a3))
- Codegen plugins config ([d943206](https://github.com/lewebsimple/nuxt-graphql/commit/d943206))
- Registry template ([6f7ca65](https://github.com/lewebsimple/nuxt-graphql/commit/6f7ca65))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.5.2

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.5.1...v0.5.2)

### 🩹 Fixes

- Fragment type suffix ([b023514](https://github.com/lewebsimple/nuxt-graphql/commit/b023514))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.5.1

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.5.0...v0.5.1)

### 🩹 Fixes

- Auto-imported server helpers ([68d6be9](https://github.com/lewebsimple/nuxt-graphql/commit/68d6be9))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.5.0

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.4.0...v0.5.0)

### 💅 Refactors

- ⚠️  Complete rewrite of the module ([5212c6d](https://github.com/lewebsimple/nuxt-graphql/commit/5212c6d))

#### ⚠️ Breaking Changes

- ⚠️  Complete rewrite of the module ([5212c6d](https://github.com/lewebsimple/nuxt-graphql/commit/5212c6d))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.4.0

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.3.5...v0.4.0)

### 🚀 Enhancements

- ⚠️  Remove Zod generation schema (postponed) ([c52e0ad](https://github.com/lewebsimple/nuxt-graphql/commit/c52e0ad))

### 🩹 Fixes

- Ensure middleware hooks are called only once per execution ([3afb13c](https://github.com/lewebsimple/nuxt-graphql/commit/3afb13c))

#### ⚠️ Breaking Changes

- ⚠️  Remove Zod generation schema (postponed) ([c52e0ad](https://github.com/lewebsimple/nuxt-graphql/commit/c52e0ad))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.3.5

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.3.4...v0.3.5)

### 🩹 Fixes

- UseGraphQLQuery should accept Partial<CacheConfig> ([cbe9ac0](https://github.com/lewebsimple/nuxt-graphql/commit/cbe9ac0))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.3.4

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.3.3...v0.3.4)

### 🩹 Fixes

- Cache-config should be in runtime/ ([3db5274](https://github.com/lewebsimple/nuxt-graphql/commit/3db5274))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.3.3

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.3.2...v0.3.3)

### 🚀 Enhancements

- Provide dummy schema when no schemas provided. ([5ade714](https://github.com/lewebsimple/nuxt-graphql/commit/5ade714))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.3.2

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.3.1...v0.3.2)

### 🩹 Fixes

- Abort if no schemas defined (prevents module installation) ([1616391](https://github.com/lewebsimple/nuxt-graphql/commit/1616391))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.3.1

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.3.0...v0.3.1)

### 🩹 Fixes

- Export helpers from separate entry  file ([1c9be5c](https://github.com/lewebsimple/nuxt-graphql/commit/1c9be5c))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.3.0

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.2.2...v0.3.0)

### 🩹 Fixes

- Skip module if PLAYGROUND_MODULE_BUILD defined ([a561721](https://github.com/lewebsimple/nuxt-graphql/commit/a561721))

### 💅 Refactors

- ⚠️  Complete module rewrite with better structure, comments and documentation ([ffd88d1](https://github.com/lewebsimple/nuxt-graphql/commit/ffd88d1))

#### ⚠️ Breaking Changes

- ⚠️  Complete module rewrite with better structure, comments and documentation ([ffd88d1](https://github.com/lewebsimple/nuxt-graphql/commit/ffd88d1))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.2.2

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.2.1...v0.2.2)

### 🚀 Enhancements

- Initial defineRemoteMiddleware helper ([53837e8](https://github.com/lewebsimple/nuxt-graphql/commit/53837e8))
- Remote middleware (onRequest / onResponse) ([883b65b](https://github.com/lewebsimple/nuxt-graphql/commit/883b65b))

### 🩹 Fixes

- Create context in graphql handler ([07fc8de](https://github.com/lewebsimple/nuxt-graphql/commit/07fc8de))
- Tests ([d066741](https://github.com/lewebsimple/nuxt-graphql/commit/d066741))

### 💅 Refactors

- Object-style signatures for helpers ([85ad80d](https://github.com/lewebsimple/nuxt-graphql/commit/85ad80d))

### 🏡 Chore

- Update README and copilot-instructions ([0cf3353](https://github.com/lewebsimple/nuxt-graphql/commit/0cf3353))
- Update README.md ([7827838](https://github.com/lewebsimple/nuxt-graphql/commit/7827838))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.2.1

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.2.0...v0.2.1)

### 🚀 Enhancements

- Local / remote schema stitching ([d52c079](https://github.com/lewebsimple/nuxt-graphql/commit/d52c079))

### 🩹 Fixes

- Eager schema generation ([9617ba7](https://github.com/lewebsimple/nuxt-graphql/commit/9617ba7))
- Update tests ([f1244eb](https://github.com/lewebsimple/nuxt-graphql/commit/f1244eb))
- UseLogger instead of consola ([861673e](https://github.com/lewebsimple/nuxt-graphql/commit/861673e))

### 💅 Refactors

- Unified schemas definition ([e2916ba](https://github.com/lewebsimple/nuxt-graphql/commit/e2916ba))

### 🏡 Chore

- Update copilot instructions ([720aa2d](https://github.com/lewebsimple/nuxt-graphql/commit/720aa2d))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.2.0

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.1.14...v0.2.0)

### 🚀 Enhancements

- ⚠️  GraphQL endpoint is now fixed to /api/graphql ([2166bd7](https://github.com/lewebsimple/nuxt-graphql/commit/2166bd7))

### 🩹 Fixes

- Runtime logger exported directly ([c2b99b5](https://github.com/lewebsimple/nuxt-graphql/commit/c2b99b5))

### 💅 Refactors

- Split runtime into app and server, rename helpers ([4bc7443](https://github.com/lewebsimple/nuxt-graphql/commit/4bc7443))
- Split the handler with shared constants and a factory ([0b7df64](https://github.com/lewebsimple/nuxt-graphql/commit/0b7df64))
- Inline types where they are used ([78a8781](https://github.com/lewebsimple/nuxt-graphql/commit/78a8781))

#### ⚠️ Breaking Changes

- ⚠️  GraphQL endpoint is now fixed to /api/graphql ([2166bd7](https://github.com/lewebsimple/nuxt-graphql/commit/2166bd7))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.1.14

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.1.13...v0.1.14)

### 🩹 Fixes

- Schema / documents in generates config only ([71a3f3d](https://github.com/lewebsimple/nuxt-graphql/commit/71a3f3d))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.1.13

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.1.12...v0.1.13)

### 🚀 Enhancements

- Allow custom codegen generates ([2cbef8f](https://github.com/lewebsimple/nuxt-graphql/commit/2cbef8f))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.1.12

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.1.11...v0.1.12)

### 🚀 Enhancements

- More tests ([e7cefb7](https://github.com/lewebsimple/nuxt-graphql/commit/e7cefb7))

### 🩹 Fixes

- Type errors ([e5b7f01](https://github.com/lewebsimple/nuxt-graphql/commit/e5b7f01))
- Lint errors ([54af38d](https://github.com/lewebsimple/nuxt-graphql/commit/54af38d))

### 🏡 Chore

- Better source formatting and comments ([8ef21f0](https://github.com/lewebsimple/nuxt-graphql/commit/8ef21f0))
- Update @graphql-codegen/* packages ([2bb90db](https://github.com/lewebsimple/nuxt-graphql/commit/2bb90db))
- Rename server utils to prevent confusion ([cc3c289](https://github.com/lewebsimple/nuxt-graphql/commit/cc3c289))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.1.11

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.1.10...v0.1.11)

### 🚀 Enhancements

- Static headers / graphql:headers hook ([73d4b9c](https://github.com/lewebsimple/nuxt-graphql/commit/73d4b9c))
- Error handling ([f2f96ec](https://github.com/lewebsimple/nuxt-graphql/commit/f2f96ec))
- Client-side cache / useGraphQLCache ([fe3c5d7](https://github.com/lewebsimple/nuxt-graphql/commit/fe3c5d7))
- Codegen scalars config ([3fd04bf](https://github.com/lewebsimple/nuxt-graphql/commit/3fd04bf))
- Graphql-codegen-typescript-validation-schema ([e22526d](https://github.com/lewebsimple/nuxt-graphql/commit/e22526d))

### 🩹 Fixes

- Content-type headers ([f813c9c](https://github.com/lewebsimple/nuxt-graphql/commit/f813c9c))

### 🏡 Chore

- Update deps ([207a895](https://github.com/lewebsimple/nuxt-graphql/commit/207a895))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.1.10

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.1.9...v0.1.10)

### 🚀 Enhancements

- UseGraphQLSubscription using graphql-sse ([21ac620](https://github.com/lewebsimple/nuxt-graphql/commit/21ac620))
- Use request fetch ([31f1e27](https://github.com/lewebsimple/nuxt-graphql/commit/31f1e27))
- Re-use server graphql client per request ([d73a2ea](https://github.com/lewebsimple/nuxt-graphql/commit/d73a2ea))
- Accept extra headers ([a1b655b](https://github.com/lewebsimple/nuxt-graphql/commit/a1b655b))

### 🩹 Fixes

- Type annotation ([a2b66a6](https://github.com/lewebsimple/nuxt-graphql/commit/a2b66a6))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.1.9

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.1.8...v0.1.9)

### 🚀 Enhancements

- Graceful error handling or GraphQL server ([7714fdd](https://github.com/lewebsimple/nuxt-graphql/commit/7714fdd))
- Minimal module options validation ([31b659a](https://github.com/lewebsimple/nuxt-graphql/commit/31b659a))

### 🩹 Fixes

- Disable GraphiQL in production ([6a0d86c](https://github.com/lewebsimple/nuxt-graphql/commit/6a0d86c))

### 💅 Refactors

- UseGraphQLMutation should return data / error from mutate ([9e0eeac](https://github.com/lewebsimple/nuxt-graphql/commit/9e0eeac))

### 🏡 Chore

- Code organization and comments ([512ca0d](https://github.com/lewebsimple/nuxt-graphql/commit/512ca0d))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.1.8

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.1.7...v0.1.8)

### 📖 Documentation

- Review playbook for Copilot ([5f0fd90](https://github.com/lewebsimple/nuxt-graphql/commit/5f0fd90))

### 🏡 Chore

- **release:** V0.1.7 ([ef2f98d](https://github.com/lewebsimple/nuxt-graphql/commit/ef2f98d))
- Hide chore commits from changlog ([1c9aa59](https://github.com/lewebsimple/nuxt-graphql/commit/1c9aa59))
- Update release script ([660229e](https://github.com/lewebsimple/nuxt-graphql/commit/660229e))
- Add Nuxt MCP ([e820590](https://github.com/lewebsimple/nuxt-graphql/commit/e820590))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.1.7

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.1.6...v0.1.7)

### 🚀 Enhancements

- Type safe composables for auto-imported GraphQL operations ([700cc59](https://github.com/lewebsimple/nuxt-graphql/commit/700cc59))

### 🏡 Chore

- **release:** V0.1.6 ([de36418](https://github.com/lewebsimple/nuxt-graphql/commit/de36418))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.1.6

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.1.5...v0.1.6)

### 🚀 Enhancements

- Make context optional ([32c9fe8](https://github.com/lewebsimple/nuxt-graphql/commit/32c9fe8))
- Lazy GraphQL Yoga initialization ([c7c5cee](https://github.com/lewebsimple/nuxt-graphql/commit/c7c5cee))

### 🩹 Fixes

- Yoga handler template cannot be .ts ([27a1b2a](https://github.com/lewebsimple/nuxt-graphql/commit/27a1b2a))

### 🏡 Chore

- **release:** V0.1.5 ([6c58f71](https://github.com/lewebsimple/nuxt-graphql/commit/6c58f71))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.1.5

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.1.4...v0.1.5)

### 🚀 Enhancements

- Initial graphql-request client plugin and useGraphQL composable ([2c0b8d7](https://github.com/lewebsimple/nuxt-graphql/commit/2c0b8d7))

### 💅 Refactors

- Copy templates to dist for yoga-handler ([05eef65](https://github.com/lewebsimple/nuxt-graphql/commit/05eef65))

### 🏡 Chore

- **release:** V0.1.4 ([cc0f974](https://github.com/lewebsimple/nuxt-graphql/commit/cc0f974))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.1.4

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.1.3...v0.1.4)

### 💅 Refactors

- Export GraphQLContext from user-provided context ([c133d81](https://github.com/lewebsimple/nuxt-graphql/commit/c133d81))

### 🏡 Chore

- **release:** V0.1.3 ([cdef70e](https://github.com/lewebsimple/nuxt-graphql/commit/cdef70e))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.1.3

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.1.2...v0.1.3)

### 💅 Refactors

- Use inline templates instead of readFileSync ([1992294](https://github.com/lewebsimple/nuxt-graphql/commit/1992294))

### 🏡 Chore

- **release:** V0.1.2 ([51efad8](https://github.com/lewebsimple/nuxt-graphql/commit/51efad8))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.1.2

[compare changes](https://github.com/lewebsimple/nuxt-graphql/compare/v0.1.1...v0.1.2)

### 🚀 Enhancements

- User provided GraphQL context ([1463a9b](https://github.com/lewebsimple/nuxt-graphql/commit/1463a9b))

### 🏡 Chore

- **release:** V0.1.1 ([3c716de](https://github.com/lewebsimple/nuxt-graphql/commit/3c716de))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

## v0.1.1


### 🚀 Enhancements

- GraphQL Yoga server handler with user-provided schema ([a0dc34a](https://github.com/lewebsimple/nuxt-graphql/commit/a0dc34a))

### 🩹 Fixes

- Public publishConfig access ([a64ada8](https://github.com/lewebsimple/nuxt-graphql/commit/a64ada8))

### 🏡 Chore

- Initial Nuxt module project ([b965319](https://github.com/lewebsimple/nuxt-graphql/commit/b965319))

### ❤️ Contributors

- Pascal Martineau <pascal@lewebsimple.ca>

