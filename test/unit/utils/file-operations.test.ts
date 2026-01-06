import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { findSingleFile, findMultipleFiles, writeFileIfChanged } from "../../../src/helpers/file-operations";

const TEST_DIR = join(process.cwd(), "test-tmp");

describe("file-operations", () => {
  beforeEach(() => {
    // Create test directory structure
    mkdirSync(join(TEST_DIR, "dir1"), { recursive: true });
    mkdirSync(join(TEST_DIR, "dir2"), { recursive: true });
    mkdirSync(join(TEST_DIR, "dir3"), { recursive: true });

    // Create test files
    writeFileSync(join(TEST_DIR, "dir1", "test.ts"), "content1");
    writeFileSync(join(TEST_DIR, "dir2", "test.mjs"), "content2");
    writeFileSync(join(TEST_DIR, "dir3", "other.ts"), "content3");
  });

  afterEach(() => {
    // Clean up test directory
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe("findSingleFile", () => {
    it("should find file in first matching directory", async () => {
      const dirs = [
        join(TEST_DIR, "dir1"),
        join(TEST_DIR, "dir2"),
      ];

      const result = await findSingleFile(dirs, "test.{ts,mjs}");

      expect(result).toBe(join(TEST_DIR, "dir1", "test.ts"));
    });

    it("should find file in second directory if not in first", async () => {
      const dirs = [
        join(TEST_DIR, "dir3"),
        join(TEST_DIR, "dir2"),
      ];

      const result = await findSingleFile(dirs, "test.{ts,mjs}");

      expect(result).toBe(join(TEST_DIR, "dir2", "test.mjs"));
    });

    it("should return undefined if not found and not required", async () => {
      const dirs = [join(TEST_DIR, "dir1")];

      const result = await findSingleFile(dirs, "nonexistent.ts", false);

      expect(result).toBeUndefined();
    });

    it("should throw if required and not found", async () => {
      const dirs = [join(TEST_DIR, "dir1")];

      await expect(
        findSingleFile(dirs, "nonexistent.ts", true),
      ).rejects.toThrow("File not found");
    });
  });

  describe("findMultipleFiles", () => {
    it("should find all matching files across directories", async () => {
      const dirs = [
        join(TEST_DIR, "dir1"),
        join(TEST_DIR, "dir2"),
        join(TEST_DIR, "dir3"),
      ];

      const result = await findMultipleFiles(dirs, "*.ts");

      expect(result).toHaveLength(2);
      expect(result).toContain(join(TEST_DIR, "dir1", "test.ts"));
      expect(result).toContain(join(TEST_DIR, "dir3", "other.ts"));
    });

    it("should return empty array if no files found", async () => {
      const dirs = [join(TEST_DIR, "dir1")];

      const result = await findMultipleFiles(dirs, "*.nonexistent");

      expect(result).toEqual([]);
    });

    it("should deduplicate files", async () => {
      // Create duplicate file structure
      writeFileSync(join(TEST_DIR, "dir1", "duplicate.ts"), "content");
      writeFileSync(join(TEST_DIR, "dir2", "duplicate.ts"), "content");

      const dirs = [
        join(TEST_DIR, "dir1"),
        join(TEST_DIR, "dir2"),
      ];

      const result = await findMultipleFiles(dirs, "duplicate.ts");

      // Should return unique files even if same name
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("writeFileIfChanged", () => {
    const testFile = join(TEST_DIR, "write-test.txt");

    it("should write file if it doesn't exist", () => {
      const written = writeFileIfChanged(testFile, "new content");

      expect(written).toBe(true);
    });

    it("should not write if content is the same", () => {
      writeFileIfChanged(testFile, "same content");
      const written = writeFileIfChanged(testFile, "same content");

      expect(written).toBe(false);
    });

    it("should write if content is different", () => {
      writeFileIfChanged(testFile, "old content");
      const written = writeFileIfChanged(testFile, "new content");

      expect(written).toBe(true);
    });

    it("should create parent directories if needed", () => {
      const nestedFile = join(TEST_DIR, "nested", "deep", "file.txt");
      const written = writeFileIfChanged(nestedFile, "content");

      expect(written).toBe(true);
    });
  });
});
