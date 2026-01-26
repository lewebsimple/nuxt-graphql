import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export function splitModule(ts: string): { mjs: string; dts: string } {
  const tsCompiler = require("typescript") as typeof import("typescript");

  const fileName = "module.ts";
  const outputs: Record<string, string> = {};

  const compilerOptions: import("typescript").CompilerOptions = {
    target: tsCompiler.ScriptTarget.ES2020,
    module: tsCompiler.ModuleKind.ESNext,
    moduleResolution: tsCompiler.ModuleResolutionKind.NodeNext,
    declaration: true,
    importsNotUsedAsValues: tsCompiler.ImportsNotUsedAsValues.Remove,
    preserveValueImports: false,
  };

  const host = tsCompiler.createCompilerHost(compilerOptions, true);

  host.getSourceFile = (name) =>
    name === fileName
      ? tsCompiler.createSourceFile(fileName, ts, tsCompiler.ScriptTarget.ESNext, true)
      : undefined;

  host.readFile = () => ts;
  host.fileExists = (f) => f === fileName;

  host.writeFile = (name, content) => {
    outputs[name] = content;
  };

  const program = tsCompiler.createProgram([fileName], compilerOptions, host);

  program.emit();

  return {
    mjs: Object.entries(outputs).find(([n]) => n.endsWith(".js"))?.[1]?.trim() ?? "",
    dts: Object.entries(outputs).find(([n]) => n.endsWith(".d.ts"))?.[1]?.trim() ?? "",
  };
}
