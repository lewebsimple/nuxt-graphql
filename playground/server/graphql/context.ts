import { defineGraphQLContext } from "../../../src/runtime/server/utils/defineGraphQLContext";

export default defineGraphQLContext(() => ({ message: "Hello from custom context!" }));
