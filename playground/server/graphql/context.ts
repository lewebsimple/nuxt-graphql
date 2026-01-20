import { defineGraphQLContext } from "../../../src/runtime/server/lib/context";

export default defineGraphQLContext(() => ({ message: "Hello from custom context!" }));
