import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const rootDir = fileURLToPath(new URL("..", import.meta.url));

function compileFixture() {
  const tempDir = mkdtempSync(join(tmpdir(), "nuxt-graphql-remote-executor-"));
  const tsconfigPath = join(tempDir, "tsconfig.json");
  const remoteExecutorPath = relative(
    tempDir,
    resolve(rootDir, "src/runtime/server/lib/remote-executor"),
  ).replaceAll("\\", "/");
  const remoteExecutorImport = remoteExecutorPath.startsWith(".")
    ? remoteExecutorPath
    : `./${remoteExecutorPath}`;

  writeFileSync(
    join(tempDir, "context.ts"),
    [
      `export type GraphQLContext = {`,
      `  remoteAuthToken: string;`,
      `  user: { id: string };`,
      `};`,
      ``,
    ].join("\n"),
  );

  writeFileSync(
    join(tempDir, "input.ts"),
    [
      `import { defineRemoteExecutorHooks } from ${JSON.stringify(remoteExecutorImport)};`,
      ``,
      `export default defineRemoteExecutorHooks({`,
      `  onRequest(request, context) {`,
      `    const requestToken: string | undefined = request.context?.remoteAuthToken;`,
      ``,
      `    if (context) {`,
      `      const userId: string = context.user.id;`,
      `      void userId;`,
      `    }`,
      ``,
      `    void requestToken;`,
      `  },`,
      ``,
      `  onResult(_result, context, meta) {`,
      `    const contextToken: string | undefined = context?.remoteAuthToken;`,
      `    const status: number = meta.status;`,
      `    const session: string | null = meta.headers.get("woocommerce-session");`,
      `    void contextToken; void status; void session;`,
      `  },`,
      ``,
      `  onError(_error, context, meta) {`,
      `    const contextToken: string | undefined = context?.remoteAuthToken;`,
      `    const status: number | undefined = meta?.status;`,
      `    void contextToken; void status;`,
      `  },`,
      `});`,
      ``,
    ].join("\n"),
  );

  writeFileSync(
    tsconfigPath,
    JSON.stringify(
      {
        compilerOptions: {
          strict: true,
          noEmit: true,
          module: "ESNext",
          moduleResolution: "Bundler",
          target: "ESNext",
          lib: ["ESNext", "DOM"],
          skipLibCheck: true,
          types: [],
          paths: {
            "#graphql/context": ["./context.ts"],
          },
        },
        include: ["./input.ts"],
      },
      null,
      2,
    ),
  );

  try {
    const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
    const parsedConfig = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      tempDir,
      undefined,
      tsconfigPath,
    );
    const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);
    const diagnostics = ts.getPreEmitDiagnostics(program);

    if (!diagnostics.length) {
      return "";
    }

    return ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (fileName) => fileName,
      getCurrentDirectory: () => tempDir,
      getNewLine: () => "\n",
    });
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
}

describe("remote executor typing", () => {
  it("defaults hook context to GraphQLContext", () => {
    const diagnostics = compileFixture();
    expect(diagnostics).toBe("");
  });
});
