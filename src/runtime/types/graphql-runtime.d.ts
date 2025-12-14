import type * as UserSchema from "{{schemaPath}}";
import type * as UserContext from "{{contextPath}}";

type UserCreateContext = typeof UserContext.createContext;

export type GraphQLContext = Awaited<ReturnType<UserCreateContext>>;

declare module "#graphql/schema" {
  export const schema: UserSchema.schema;
}

declare module "#graphql/context" {
  export const createContext: UserCreateContext;
}

declare module "#graphql/runtime" {
  export type { GraphQLContext };
}
