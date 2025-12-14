import { existsSync } from "node:fs";
import { join } from "node:path";
import { cyan, reset } from "./logger";

export function findServerFile(layerDirs: { server: string }[], relativePath: string, isRequired = false) {
  const extensions = ["ts", "mjs"];
  for (const dir of layerDirs) {
    const candidates = extensions.map((ext) => join(dir.server, `${relativePath}.${ext}`));
    const fullPath = candidates.find(existsSync);
    if (fullPath) {
      return fullPath;
    }
  }
  if (isRequired) {
    throw new Error(`Could not find required server file ${cyan}${relativePath}.{${extensions.join(",")}}${reset} in the following layers:\n${layerDirs.map(({ server }) => server).join("\n")}`);
  }
}
