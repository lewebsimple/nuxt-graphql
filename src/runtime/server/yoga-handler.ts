import { createYoga } from "graphql-yoga";
import { defineEventHandler } from "h3";
import { schema } from "#graphql/schema";
import { createContext } from "#graphql/context";

export default defineEventHandler(async (event) => {
  const yoga = createYoga({
    schema,
    graphqlEndpoint: "{{endpoint}}",
    context: () => createContext(event),
  });
  return yoga.handle(event.node.req, event.node.res);
});
