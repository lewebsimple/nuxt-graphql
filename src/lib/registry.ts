import { codegen } from "@graphql-codegen/core";
import type { Types } from "@graphql-codegen/plugin-helpers";
import zodPreset from "@lewebsimple/graphql-codegen-zod";
import { addTypeTemplate } from "@nuxt/kit";
import { parse, printSchema, type GraphQLSchema } from "graphql";
import type { Nuxt } from "nuxt/schema";

import { stripExtension } from "./path";
import { addCompiledTemplate } from "./ts-compiler";

type RegistryCoreArtifacts = {
  "registry.ts": string;
  "types.d.ts": string;
};

type RegistryArtifacts = RegistryCoreArtifacts & Record<string, string>;

type RegistryTemplatePaths = {
  registryDst: string;
  typesDts: string;
};

/** Registry template generation input. */
export type GenerateRegistryArtifactsInput = {
  /** GraphQL schema. */
  schema: GraphQLSchema;
  /** Loaded GraphQL documents. */
  documents: Types.DocumentFile[];
};

/**
 * Generate GraphQL registry artifacts from schema and documents.
 *
 * @param input Registry generation input.
 * @param nuxt Nuxt instance.
 * @returns Generated registry artifacts as a record of filename to content.
 */
export async function generateRegistryArtifacts({
  schema,
  documents,
}: GenerateRegistryArtifactsInput): Promise<RegistryArtifacts> {
  const generates = await zodPreset.buildGeneratesSection({
    baseOutputDir: "registry.ts",
    schema: parse(printSchema(schema)),
    documents: documents,
    config: {
      scalars: {
        ZodValue: "unknown",
      },
    },
    pluginMap: {},
    plugins: [],
    presetConfig: {},
  });

  if (!documents.length) {
    return {
      "registry.ts": getRegistryFallback(),
      "types.d.ts": getTypesFallback(),
    };
  }
  const files: Record<string, string> = {};

  await Promise.all(
    generates.map((generate) =>
      codegen(generate).then((content) => {
        files[generate.filename] = content;
      }),
    ),
  );

  const artifacts: RegistryArtifacts = {
    ...files,
    "registry.ts": files["registry.ts"] || getRegistryFallback(),
    "types.d.ts": files["types.d.ts"] || getTypesFallback(),
  };

  return artifacts;
}

/**
 * Register registry artifacts as Nuxt templates.
 *
 * TypeScript module artifacts are routed through `addCompiledTemplate`, which keeps development
 * output as `.ts` files and compiles to `.mjs` plus `.d.ts` for build-time Nitro consumption.
 *
 * @param artifacts Generated artifact contents by filename.
 * @param nuxt Nuxt instance.
 * @returns Paths to emitted template files that need to be referenced elsewhere.
 */
export async function addRegistryArtifactTemplates(
  artifacts: RegistryArtifacts,
  nuxt: Nuxt,
): Promise<RegistryTemplatePaths> {
  let registryDst = "";
  let typesDts = "";

  for (const [filename, content] of Object.entries(artifacts)) {
    switch (filename) {
      case "types.d.ts":
        typesDts = addTypeTemplate(
          {
            filename: "graphql/types.d.ts",
            getContents: () => content,
            write: true,
          },
          { nitro: true, nuxt: true },
        ).dst;
        break;

      default: {
        const template = await addCompiledTemplate(
          {
            filename: `graphql/${stripExtension(filename)}`,
            getContents: () => content,
          },
          nuxt,
        );

        if (filename === "registry.ts") {
          registryDst = template.dst;
        }
        break;
      }
    }
  }

  if (!registryDst || !typesDts) {
    throw new Error("Failed to register GraphQL registry artifacts");
  }

  return { registryDst, typesDts };
}

// Fallback for registry.ts when no documents are found.
function getRegistryFallback(): string {
  return `
import type { DocumentTypeDecoration } from "@graphql-typed-document-node/core";
import type * as z from "zod";

type EnumEntry = { schema: z.ZodEnum<Record<string, string>> };

type FragmentEntry = { schema: z.ZodObject<z.ZodRawShape> };

type OperationEntry = {
  kind: "query" | "mutation" | "subscription";
  document: DocumentTypeDecoration<any, any>;
  resultSchema: z.ZodObject<z.ZodRawShape>;
  variablesSchema: z.ZodObject<z.ZodRawShape>;
};

export const enums: Record<string, EnumEntry> = {};
export const fragments: Record<string, FragmentEntry> = {};
export const operations: Record<string, OperationEntry> = {};
`.trim();
}

// Fallback for types.d.ts when no documents are found.
function getTypesFallback(): string {
  return `export type {};`;
}
