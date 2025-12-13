type UserCreateContext = typeof import("{{contextPath}}").createContext;
export type GraphQLContext = Awaited<ReturnType<UserCreateContext>>;

declare module "#graphql/runtime" {
  import { schema } from "#graphql/schema";
  import { createContext } from "#graphql/context";

  export { schema, createContext };
  export type { GraphQLContext };
}
