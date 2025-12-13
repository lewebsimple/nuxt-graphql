import { defineNuxtModule, addPlugin, createResolver, addTemplate, addServerHandler, getLayerDirectories } from "@nuxt/kit";
import { readFileSync } from "node:fs";
import { findServerFile } from "./utils/server-files";
import { logger, cyan, reset } from "./utils/logger";

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
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);

    const { rootDir, serverDir } = nuxt.options;
    const layerDirs = [...getLayerDirectories(nuxt), { server: serverDir.replace(rootDir, `${rootDir}/playground`) }];

    // Resolve GraphQL schema and alias directly
    const schemaPath = findServerFile(layerDirs, "graphql/schema");
    nuxt.options.alias["#graphql/schema"] = schemaPath.replace(/\.(ts|mjs)$/i, "");
    logger.success(`GraphQL schema found at ${cyan}${schemaPath}${reset}`);

    // Add GraphQL schema types
    addTemplate({ filename: "types/graphql-schema.d.ts", src: resolver.resolve("./runtime/types/graphql-schema.d.ts") });

    // Add GraphQL Yoga server handler
    const endpoint = options.yoga?.endpoint ?? "/api/graphql";
    addTemplate({
      filename: "graphql/handler.ts",
      write: true,
      getContents: () => {
        const template = readFileSync(resolver.resolve("./runtime/server/handler.ts"), "utf-8");
        return template
          .replace("{{endpoint}}", endpoint);
      },
    });
    addServerHandler({ route: endpoint, handler: "#build/graphql/handler.ts" });
    logger.success(`GraphQL Yoga server handler added at ${cyan}${endpoint}${reset}`);

    addPlugin(resolver.resolve("./runtime/plugin"));
  },
});
