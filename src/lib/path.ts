import { relative, resolve, parse } from "node:path";

/**
 * Convert absolute paths to relative paths.
 * @param {string} from Starting path
 * @param {string} to Target path
 * @returns {string} Relative path from "from" to "to"
 */
export function toRelativePath(from: string, to: string): string {
  let relativePath = relative(resolve(from), resolve(to));
  relativePath = relativePath.replace(/\\/g, "/");
  if (!relativePath.startsWith("./") && !relativePath.startsWith("../")) {
    relativePath = `./${relativePath}`;
  }
  return relativePath;
}

/**
 * Strip the file extension from a file path.
 * @param filePath The file path to process.
 * @returns The file path without the extension.
 */
export function stripExtension(filePath: string): string {
  const { dir, name } = parse(filePath);
  return dir ? `${dir}/${name}` : name;
}
