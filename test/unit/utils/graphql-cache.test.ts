import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  initCache,
  getCacheKey,
  cacheGet,
  cacheSet,
  cacheInvalidate,
  dedupeGet,
  dedupeSet,
  registerRefresh,
} from "../../../src/runtime/utils/graphql-cache";

describe("graphql-cache", () => {
  beforeEach(() => {
    // Initialize cache before each test
    initCache("memory");
  });

  describe("getCacheKey", () => {
    it("should generate consistent keys for same inputs", () => {
      const key1 = getCacheKey("GetUser", { id: "123" });
      const key2 = getCacheKey("GetUser", { id: "123" });

      expect(key1).toBe(key2);
    });

    it("should generate different keys for different operations", () => {
      const key1 = getCacheKey("GetUser", { id: "123" });
      const key2 = getCacheKey("GetUsers", { id: "123" });

      expect(key1).not.toBe(key2);
    });

    it("should generate different keys for different variables", () => {
      const key1 = getCacheKey("GetUser", { id: "123" });
      const key2 = getCacheKey("GetUser", { id: "456" });

      expect(key1).not.toBe(key2);
    });

    it("should handle null/undefined variables", () => {
      const key1 = getCacheKey("GetUsers", null);
      const key2 = getCacheKey("GetUsers", undefined);

      expect(key1).toBe(key2);
    });
  });

  describe("cache operations", () => {
    it("should store and retrieve data", async () => {
      const data = { user: { id: "123", name: "Test" } };

      await cacheSet("GetUser", { id: "123" }, data, 60000);
      const cached = await cacheGet("GetUser", { id: "123" });

      expect(cached).toEqual(data);
    });

    it("should return null for non-existent cache", async () => {
      const cached = await cacheGet("GetUser", { id: "999" });

      expect(cached).toBeNull();
    });

    it("should expire cache after TTL", async () => {
      const data = { user: { id: "123", name: "Test" } };

      // Set with 1ms TTL
      await cacheSet("GetUser", { id: "123" }, data, 1);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 10));

      const cached = await cacheGet("GetUser", { id: "123" });

      expect(cached).toBeNull();
    });

    it("should invalidate specific query", async () => {
      const data1 = { user: { id: "123", name: "Test1" } };
      const data2 = { user: { id: "456", name: "Test2" } };

      await cacheSet("GetUser", { id: "123" }, data1, 60000);
      await cacheSet("GetUser", { id: "456" }, data2, 60000);

      await cacheInvalidate("GetUser", { id: "123" });

      expect(await cacheGet("GetUser", { id: "123" })).toBeNull();
      expect(await cacheGet("GetUser", { id: "456" })).toEqual(data2);
    });

    it("should invalidate all queries with same operation name", async () => {
      await cacheSet("GetUser", { id: "123" }, { user: { id: "123" } }, 60000);
      await cacheSet("GetUser", { id: "456" }, { user: { id: "456" } }, 60000);
      await cacheSet("GetUsers", {}, { users: [] }, 60000);

      await cacheInvalidate("GetUser");

      expect(await cacheGet("GetUser", { id: "123" })).toBeNull();
      expect(await cacheGet("GetUser", { id: "456" })).toBeNull();
      expect(await cacheGet("GetUsers", {})).toEqual({ users: [] });
    });

    it("should invalidate all queries", async () => {
      await cacheSet("GetUser", { id: "123" }, { user: { id: "123" } }, 60000);
      await cacheSet("GetUsers", {}, { users: [] }, 60000);

      await cacheInvalidate();

      expect(await cacheGet("GetUser", { id: "123" })).toBeNull();
      expect(await cacheGet("GetUsers", {})).toBeNull();
    });
  });

  describe("deduplication", () => {
    it("should deduplicate concurrent requests", () => {
      const promise = Promise.resolve({ user: { id: "123" } });

      dedupeSet("GetUser", { id: "123" }, promise);
      const dedupedPromise = dedupeGet("GetUser", { id: "123" });

      expect(dedupedPromise).toBe(promise);
    });

    it("should clear deduped request after completion", async () => {
      const promise = Promise.resolve({ user: { id: "123" } });

      dedupeSet("GetUser", { id: "123" }, promise);
      await promise;

      // Give it time to clean up
      await new Promise((resolve) => setTimeout(resolve, 10));

      const dedupedPromise = dedupeGet("GetUser", { id: "123" });
      expect(dedupedPromise).toBeNull();
    });

    it("should return null for non-existent deduped request", () => {
      const dedupedPromise = dedupeGet("GetUser", { id: "999" });

      expect(dedupedPromise).toBeNull();
    });
  });

  describe("refresh callbacks", () => {
    it("should register and call refresh callback on invalidation", async () => {
      const refreshFn = vi.fn();
      const data = { user: { id: "123" } };

      await cacheSet("GetUser", { id: "123" }, data, 60000);
      registerRefresh("GetUser", { id: "123" }, refreshFn);

      await cacheInvalidate("GetUser", { id: "123" });

      expect(refreshFn).toHaveBeenCalledTimes(1);
    });

    it("should call multiple refresh callbacks", async () => {
      const refreshFn1 = vi.fn();
      const refreshFn2 = vi.fn();

      registerRefresh("GetUser", { id: "123" }, refreshFn1);
      registerRefresh("GetUser", { id: "123" }, refreshFn2);

      await cacheInvalidate("GetUser", { id: "123" });

      expect(refreshFn1).toHaveBeenCalledTimes(1);
      expect(refreshFn2).toHaveBeenCalledTimes(1);
    });

    it("should unregister callback", async () => {
      const refreshFn = vi.fn();

      const unregister = registerRefresh("GetUser", { id: "123" }, refreshFn);
      unregister();

      await cacheInvalidate("GetUser", { id: "123" });

      expect(refreshFn).not.toHaveBeenCalled();
    });
  });
});
