import { GraphQLClient } from "graphql-request";
import { defineNuxtPlugin, useRequestURL, useRuntimeConfig } from "#imports";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const { origin } = useRequestURL();

  const client = new GraphQLClient(`${origin}${config.public.graphql.endpoint}`);

  return {
    provide: {
      graphql: client,
    },
  };
});
