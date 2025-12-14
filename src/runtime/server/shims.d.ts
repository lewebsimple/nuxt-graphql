declare module "#graphql/schema" {
  import type { GraphQLSchema } from "graphql";

  const schema: GraphQLSchema;
  export { schema };
}

declare module "#graphql/context" {
  import type { H3Event } from "h3";

  function createContext(event: H3Event): Promise<Record<string, unknown>>;
  export { createContext };
}
