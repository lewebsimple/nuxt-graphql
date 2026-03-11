import { createRequire } from "node:module";

import { addTemplate } from "@nuxt/kit";
import type { Nuxt, NuxtServerTemplate } from "nuxt/schema";
import type TypeScript from "typescript";
const require = createRequire(import.meta.url);

/** Split TypeScript module output. */
export type CompiledTsModule = {
  /** JavaScript module output. */
  mjs: string;
  /** Type declaration output. */
  dts: string;
};

/**
 * Compile a TypeScript source string and split emitted JS and DTS content.
 *
 * @param ts TypeScript module source.
 * @returns Emitted module and declaration outputs.
 */
export function compileTsModule(ts: string): CompiledTsModule {
  const tsCompiler = require("typescript") as typeof TypeScript;

  const fileName = "module.ts";
  const outputs: Record<string, string> = {};

  const compilerOptions: TypeScript.CompilerOptions = {
    target: tsCompiler.ScriptTarget.ES2020,
    module: tsCompiler.ModuleKind.ESNext,
    moduleResolution: tsCompiler.ModuleResolutionKind.NodeNext,
    declaration: true,
  };
  const host = tsCompiler.createCompilerHost(compilerOptions, true);

  host.getSourceFile = (name) =>
    name === fileName
      ? tsCompiler.createSourceFile(fileName, ts, tsCompiler.ScriptTarget.ESNext, true)
      : undefined;

  host.readFile = () => ts;
  host.fileExists = (f) => f === fileName;
  host.writeFile = (name, content) => (outputs[name] = content);

  const program = tsCompiler.createProgram([fileName], compilerOptions, host);
  program.emit();

  return {
    mjs: getCompiledContent(outputs, ".js"),
    dts: getCompiledContent(outputs, ".d.ts"),
  };
}

/**
 * Get compiled content by file extension.
 *
 * @param outputs Compiler output map.
 * @param extension File extension to pick.
 * @returns Matching compiled content.
 */
function getCompiledContent(outputs: Record<string, string>, extension: string): string {
  return (
    Object.entries(outputs)
      .find(([name]) => name.endsWith(extension))?.[1]
      ?.trim() ?? ""
  );
}

/**
 * Wrap addTemplate to support TypeScript module compilation.
 * @param template Template to add.
 * @param nuxt Nuxt instance.
 * @returns Added template descriptor for the generated output file.
 */
export async function addCompiledTemplate(
  { filename, getContents }: NuxtServerTemplate,
  nuxt: Nuxt,
) {
  if (nuxt.options.dev || nuxt.options._prepare) {
    return addTemplate({ filename: `${filename}.ts`, getContents, write: true });
  } else {
    const { mjs, dts } = compileTsModule(await getContents());
    addTemplate({
      filename: `${filename}.d.ts`,
      getContents: () => dts,
      write: true,
    });
    return addTemplate({
      filename: `${filename}.mjs`,
      getContents: () => mjs,
      write: true,
    });
  }
}
