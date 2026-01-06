# Changelog

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

