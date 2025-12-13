import { defineNuxtModule, addPlugin, createResolver, useLogger } from "@nuxt/kit";

export interface GraphQLYogaConfig {
  endpoint?: string;
}

export interface ModuleOptions {
  yoga?: GraphQLYogaConfig;
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "@lewebsimple/nuxt-graphql",
    configKey: "graphql",
  },
  defaults: {
    yoga: {
      endpoint: "/api/graphql",
    },
  },
  setup(_options, _nuxt) {
    const logger = useLogger("@lewebsimple/nuxt-graphql");
    const resolver = createResolver(import.meta.url);

    logger.info("✨ Setting up @lewebsimple/nuxt-graphql module");

    addPlugin(resolver.resolve("./runtime/plugin"));
  },
});
