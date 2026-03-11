import { mkdir, writeFile } from "fs/promises";

import { codegen } from "@graphql-codegen/core";
import type { Types } from "@graphql-codegen/plugin-helpers";
import zodPreset from "@lewebsimple/graphql-codegen-zod";
import { createResolver } from "@nuxt/kit";
import { parse, printSchema, type GraphQLSchema } from "graphql";
import type { Nuxt } from "nuxt/schema";

import { stripExtension } from "./path";
import { compileTsModule } from "./ts-compiler";

type RegistryCoreArtifacts = {
  "registry.ts": string;
  "types.d.ts": string;
};

type RegistryArtifacts = RegistryCoreArtifacts & Record<string, string>;

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
    config: {},
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

// Fallback for registry.ts when no documents are found.
function getRegistryFallback(): string {
  return `
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
import type * as z from "zod";

type EnumEntry = { schema: z.ZodEnum<Record<string, string>> };

type FragmentEntry = { schema: z.ZodObject<z.ZodRawShape> };

type OperationEntry = {
  kind: "query" | "mutation" | "subscription";
  document: TypedDocumentNode<any, any>;
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

/**
 * Write registry artifacts to the Nuxt build directory, compiling TypeScript modules as needed.
 *
 * @param artifacts Generated artifact contents by filename.
 * @param nuxt Nuxt instance.
 * @returns Resolves when all artifacts are written.
 */
export async function writeRegistryArtifacts(
  artifacts: RegistryArtifacts,
  nuxt: Nuxt,
): Promise<void> {
  const { resolve: resolveBuild } = createResolver(nuxt.options.buildDir);

  await mkdir(resolveBuild(`graphql/enums`), { recursive: true });
  await mkdir(resolveBuild(`graphql/fragments`), { recursive: true });
  await mkdir(resolveBuild(`graphql/operations`), { recursive: true });

  for (const [filename, content] of Object.entries(artifacts)) {
    switch (filename) {
      case "registry.ts":
        // Written by addTemplate in module setup()
        break;

      case "types.d.ts":
        await writeFile(resolveBuild(`graphql/types.d.ts`), content);
        break;

      default:
        // Split the TypeScript module into .mjs and .d.ts files in production, but keep it as a single .ts file in development / module preparation.
        // @see https://github.com/nuxt/nuxt/discussions/34154#discussioncomment-15751036
        const filePath = resolveBuild(`graphql/${stripExtension(filename)}`);
        if (nuxt.options.dev || nuxt.options._prepare) {
          await writeFile(`${filePath}.ts`, content);
        } else {
          const { mjs, dts } = compileTsModule(content);
          await writeFile(`${filePath}.mjs`, mjs);
          await writeFile(`${filePath}.d.ts`, dts);
        }
        break;
    }
  }
}
