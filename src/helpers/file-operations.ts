import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { glob } from "tinyglobby";

/**
 * Find a single file across directories
 *
 * @param dirs Directories to search in
 * @param pattern Glob pattern relative to each directory
 * @param isRequired Whether to throw if not found
 * @returns The found file path or undefined
 */
export async function findSingleFile(dirs: string[], pattern: string, isRequired: true): Promise<string>;
export async function findSingleFile(dirs: string[], pattern: string, isRequired?: false): Promise<string | undefined>;
export async function findSingleFile(dirs: string[], pattern: string, isRequired = false): Promise<string | undefined> {
  for (const dir of dirs) {
    const fullPattern = join(dir, pattern);
    const files = await glob(fullPattern, { absolute: true });
    if (files.length > 0) {
      return files[0];
    }
  }
  if (isRequired) {
    throw new Error(`File not found: ${pattern} in directories:\n${dirs.join("\n")}`);
  }
}

/**
 * Find multiple files across directories
 *
 * @param dirs Directories to search in
 * @param pattern Glob pattern relative to each directory
 * @returns Array of found file paths
 */
export type GlobPattern = string | string[];
export async function findMultipleFiles(dirs: string[], pattern: GlobPattern): Promise<string[]> {
  const files: string[] = [];
  for (const dir of dirs) {
    const foundFiles = await glob(pattern, { cwd: dir, absolute: true });
    files.push(...foundFiles);
  }
  return Array.from(new Set(files));
}

/**
 * Write file only if content changed
 *
 * @param path File path
 * @param content File content
 * @returns Whether the file was written
 */
export function writeFileIfChanged(path: string, content: string): boolean {
  if (existsSync(path) && readFileSync(path, "utf-8") === content) {
    return false;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf-8");
  return true;
}

/**
 * Convert path to relative path
 *
 * @param from Base path
 * @param to Target path
 * @returns Relative path from base to target
 */
export function toRelativePath(from: string, to: string): string {
  let relativePath = relative(resolve(from), resolve(to));
  relativePath = relativePath.replace(/\\/g, "/");
  if (!relativePath.startsWith("./") && !relativePath.startsWith("../")) {
    relativePath = `./${relativePath}`;
  }
  return relativePath;
}
