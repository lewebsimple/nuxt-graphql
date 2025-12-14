type UserCreateContext = typeof import("{{contextPath}}").createContext;
export type GraphQLContext = Awaited<ReturnType<UserCreateContext>>;

declare module "#graphql/schema" {
  import type { schema as schemaType } from "{{schemaPath}}";

  export const schema: typeof schemaType;
}

declare module "#graphql/context" {
  export { createContext } from "{{contextPath}}";
}

declare module "#graphql/runtime" {
  import { schema } from "#graphql/schema";
  import { createContext } from "#graphql/context";

  export { schema, createContext };
  export type { GraphQLContext };
}
