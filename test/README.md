# Tests

This directory contains the test suite for `@lewebsimple/nuxt-graphql`.

## Test Structure

```
test/
├── unit/              # Unit tests for utilities and composables
│   └── utils/         # Tests for utility functions
├── fixtures/          # Test Nuxt applications
│   ├── basic/         # Basic functionality tests
│   └── hooks/         # GraphQL hooks tests
├── basic.test.ts      # E2E tests for basic functionality
└── hooks.test.ts      # E2E tests for hooks functionality
```

## Running Tests

### Run all tests

```bash
npm test
```

### Run tests in watch mode

```bash
npm run test:watch
```

### Run with coverage

```bash
npm run test:coverage
```

### Run specific test file

```bash
npx vitest run test/unit/utils/codegen.test.ts
```

### Run type checking

```bash
npm run test:types
```

## Writing Tests

### Unit Tests

Unit tests are located in `test/unit/` and test individual functions and modules in isolation.

Example:
```typescript
import { describe, it, expect } from "vitest";
import { myFunction } from "../../../src/helpers/myUtil";

describe("myFunction", () => {
  it("should return expected value", () => {
    expect(myFunction("input")).toBe("output");
  });
});
```

### E2E Tests

E2E tests use `@nuxt/test-utils` to test the module in a real Nuxt application context.

Example:
```typescript
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { setup, $fetch } from "@nuxt/test-utils/e2e";

describe("my feature", async () => {
  await setup({
    rootDir: fileURLToPath(new URL("./fixtures/basic", import.meta.url)),
  });

  it("works correctly", async () => {
    const html = await $fetch("/");
    expect(html).toContain("expected content");
  });
});
```

## Test Coverage

Coverage reports are generated in the `coverage/` directory. Aim for:
- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

## Testing Best Practices

1. **Descriptive test names**: Use clear, descriptive names that explain what is being tested
2. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and assertion phases
3. **Test one thing**: Each test should verify a single behavior
4. **Use fixtures**: Create reusable test data and fixtures
5. **Mock external dependencies**: Isolate the code being tested
6. **Clean up**: Use `beforeEach` and `afterEach` to set up and tear down test state

## Debugging Tests

### Run single test in debug mode

```bash
npx vitest run --reporter=verbose test/unit/utils/codegen.test.ts
```

### Use console.log

```typescript
it("debugs behavior", () => {
  const result = myFunction();
  console.log("Result:", result);
  expect(result).toBe("expected");
});
```

### VS Code debugging

Add a breakpoint and use the "Debug Test" code lens that appears above test blocks.
