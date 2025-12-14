import {
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

    // Find user-provided GraphQL schema and context
    const schemaPath = findServerFile(layerDirs, "graphql/schema");
    const contextPath = findServerFile(layerDirs, "graphql/context");

    // Configure Nitro aliases for user files
    nuxt.hook("nitro:config", (nitroConfig) => {
      nitroConfig.alias ||= {};
      nitroConfig.alias["#graphql/schema"] = schemaPath;
      nitroConfig.alias["#graphql/context"] = contextPath;
      nitroConfig.virtual ||= {};
      nitroConfig.virtual["#graphql/runtime"] = "export { schema } from \"#graphql/schema\"\nexport { createContext } from \"#graphql/context\";";
    });

    // Generate type declarations for server context
    addTypeTemplate({
      filename: "types/graphql.d.ts",
      getContents: () => readFileSync(resolve("./runtime/types/graphql.d.ts"), "utf-8")
        .replaceAll("{{schemaPath}}", schemaPath.replace(/\.ts$/, ""))
        .replaceAll("{{contextPath}}", contextPath.replace(/\.ts$/, "")),
    });
    nuxt.hook("prepare:types", ({ references }) => {
      references.push({ path: "./types/graphql.d.ts" });
    });
    nuxt.hook("nitro:prepare:types", ({ references }) => {
      references.push({
        path: resolve(nuxt.options.buildDir, "types/graphql.d.ts"),
      });
    });

    // Add GraphQL Yoga server handler
    const endpoint = options.yoga?.endpoint ?? "/api/graphql";
    addServerTemplate({
      filename: "graphql/yoga-handler",
      getContents: () => readFileSync(resolve("./runtime/server/yoga-handler.ts"), "utf-8").replace("{{endpoint}}", endpoint),
    });
    addServerHandler({ route: endpoint, handler: "graphql/yoga-handler" });
    nuxt.hook("listen", (_server, { url }) => {
      logger.success(`GraphQL Yoga available at ${cyan}${url.replace(/\/$/, "") + endpoint}${reset}`);
    });

    addPlugin(resolve("./runtime/plugin"));
  },
});
