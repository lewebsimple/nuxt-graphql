import { createYoga } from "graphql-yoga";
import { defineEventHandler } from "h3";
import { schema } from "#graphql/schema";

const yoga = createYoga({
  schema,
  graphqlEndpoint: "{{endpoint}}",
});

export default defineEventHandler(async (event) => {
  return yoga.handle(event.node.req, event.node.res);
});
