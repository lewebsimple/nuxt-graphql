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
import { findServerFile } from "./utils/server-files";
import { logger, cyan, reset } from "./utils/logger";
import { readFileSync } from "node:fs";

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

    // Configure Nitro aliases and virtual modules
    nuxt.hook("nitro:config", (nitroConfig) => {
      nitroConfig.alias ||= {};
      nitroConfig.alias["#graphql/schema"] = schemaPath;
      nitroConfig.alias["#graphql/context"] = contextPath;
    });

    // Add GraphQL Yoga server handler
    const endpoint = options.yoga?.endpoint ?? "/api/graphql";
    addServerTemplate({
      filename: "graphql/yoga-handler",
      getContents: () => `
import { createYoga } from "graphql-yoga";
import { defineEventHandler, toWebRequest, sendWebResponse } from "h3";
import { schema } from "#graphql/schema";
import { createContext } from "#graphql/context";

const yoga = createYoga({
  schema,
  graphqlEndpoint: "${endpoint}",
});

export default defineEventHandler(async (event) => {
  const context = await createContext(event);
  const request = toWebRequest(event);
  const response = await yoga.handleRequest(request, context);
  return sendWebResponse(event, response);
});`.trim(),
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
