import { relative, resolve } from "node:path";

/**
 * Convert absolute paths to relative paths.
 * @param {string} from Starting path
 * @param {string} to Target path
 * @returns {string} Relative path from "from" to "to"
 */
export function getRelativePath(from: string, to: string): string {
  let relativePath = relative(resolve(from), resolve(to));
  relativePath = relativePath.replace(/\\/g, "/");
  if (!relativePath.startsWith("./") && !relativePath.startsWith("../")) {
    relativePath = `./${relativePath}`;
  }
  return relativePath;
}

/**
 * Remove .ts or .mjs extension from path.
 * @param {string} path File path
 * @returns {string} File path without extension
 */
export function removeExtension(path: string): string {
  return path.replace(/\.(ts|mjs)$/, "");
}
