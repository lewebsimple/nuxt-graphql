import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getPersistedEntry, setPersistedEntry } from "../src/runtime/app/lib/persisted";

import { createLocalStorageStub } from "./stubs/local-storage";

const KEY = "gql:1:global:Profiles:x";

beforeEach(() => {
  vi.stubGlobal("window", { localStorage: createLocalStorageStub() });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("persisted entries", () => {
  it("round-trips a value with its timestamps", async () => {
    await setPersistedEntry(KEY, { viewer: "alice" }, 60);

    const entry = await getPersistedEntry<{ viewer: string }>(KEY);
    expect(entry?.value).toEqual({ viewer: "alice" });
    expect(entry?.expiresAt).toBe(entry!.createdAt + 60_000);
  });

  it("expires entries after ttl seconds", async () => {
    await setPersistedEntry(KEY, "value", 60);

    vi.advanceTimersByTime(59_000);
    expect((await getPersistedEntry(KEY))?.value).toBe("value");

    vi.advanceTimersByTime(2_000);
    expect(await getPersistedEntry(KEY)).toBeUndefined();
  });

  it("never expires entries with a ttl of 0", async () => {
    await setPersistedEntry(KEY, "value", 0);

    vi.advanceTimersByTime(365 * 24 * 3_600_000);
    expect((await getPersistedEntry(KEY))?.value).toBe("value");
  });
});
