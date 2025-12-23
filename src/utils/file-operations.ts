import { dirname, join } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { glob } from "tinyglobby";
import { cyan, reset } from "./logger";

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
    throw new Error(`File not found: ${cyan}${pattern}${reset} in directories:\n${dirs.join("\n")}`);
  }
}

/**
 * Find multiple files across directories
 *
 * @param dirs Directories to search in
 * @param pattern Glob pattern relative to each directory
 * @returns Array of found file paths
 */
export async function findMultipleFiles(dirs: string[], pattern: string): Promise<string[]> {
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
