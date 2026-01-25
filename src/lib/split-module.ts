import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export function splitModule(ts: string): { mjs: string; dts: string } {
  const tsCompiler = require("typescript") as typeof import("typescript");

  // ----------------------------
  // 1. Emit ESM JavaScript
  // ----------------------------
  const mjsResult = tsCompiler.transpileModule(ts, {
    compilerOptions: {
      target: tsCompiler.ScriptTarget.ES2020,
      module: tsCompiler.ModuleKind.ESNext,
      moduleResolution: tsCompiler.ModuleResolutionKind.NodeNext,
      importsNotUsedAsValues: tsCompiler.ImportsNotUsedAsValues.Remove,
      preserveValueImports: false,
      sourceMap: false,
    },
  });

  // ----------------------------
  // 2. Emit declarations only
  // ----------------------------
  const dtsResult = tsCompiler.transpileModule(ts, {
    compilerOptions: {
      target: tsCompiler.ScriptTarget.ES2020,
      module: tsCompiler.ModuleKind.ESNext,
      moduleResolution: tsCompiler.ModuleResolutionKind.NodeNext,
      declaration: true,
      emitDeclarationOnly: true,
      stripInternal: true,
    },
  });

  return {
    mjs: mjsResult.outputText.trim(),
    dts: dtsResult.outputText.trim(),
  };
}
