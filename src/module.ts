import {
  addImportsDir,
  addPlugin,
  addServerHandler,
  addServerTemplate,
  addTypeTemplate,
  createResolver,
  defineNuxtModule,
  getLayerDirectories,
} from "@nuxt/kit";
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
    const { resolve } = createResolver(import.meta.url);

    const { rootDir, serverDir } = nuxt.options;
    const layerDirs = [...getLayerDirectories(nuxt), { server: serverDir.replace(rootDir, `${rootDir}/playground`) }];

    // Configure Nitro aliases and virtual modules
    nuxt.hook("nitro:config", (nitroConfig) => {
      nitroConfig.alias ||= {};
      nitroConfig.alias["#graphql/schema"] = findServerFile(layerDirs, "graphql/schema", true);
      nitroConfig.alias["#graphql/context"] = findServerFile(layerDirs, "graphql/context") || resolve("./runtime/server/default-context.ts");
    });

    // Add GraphQL Yoga server handler
    const endpoint = options.yoga?.endpoint ?? "/api/graphql";
    addServerTemplate({
      filename: "graphql/yoga-handler",
      getContents: () => readFileSync(resolve("./templates/yoga-handler.mjs"), "utf-8").replace("{{endpoint}}", endpoint),
    });
    addServerHandler({ route: endpoint, handler: "graphql/yoga-handler" });
    nuxt.hook("listen", (_server, { url }) => {
      logger.success(`GraphQL Yoga available at ${cyan}${url.replace(/\/$/, "") + endpoint}${reset}`);
    });

    // Expose endpoint via runtime config
    nuxt.options.runtimeConfig.public.graphql = { endpoint };

    // Add GraphQL composables
    addImportsDir(resolve("./runtime/composables"));

    // Add GraphQL plugin
    addPlugin(resolve("./runtime/plugins/graphql"));

    // Add client type declarations
    addTypeTemplate({
      filename: "types/graphql-client.d.ts",
      getContents: () => readFileSync(resolve("./runtime/types/graphql-client.d.ts"), "utf-8"),
    });
    nuxt.hook("prepare:types", ({ references }) => {
      references.push({ path: "./types/graphql-client.d.ts" });
    });
  },
});
