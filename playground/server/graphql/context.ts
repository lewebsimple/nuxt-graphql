import { defineGraphQLContext } from "../../../src/runtime/server/lib/define-graphql-context";

export default defineGraphQLContext(() => ({ message: "Hello world" }));
