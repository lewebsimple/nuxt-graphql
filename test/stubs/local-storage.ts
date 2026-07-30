/**
 * Create a Map-backed `localStorage` stand-in for tests. Install it with
 * `vi.stubGlobal("window", { localStorage: createLocalStorageStub() })`.
 *
 * @returns A minimal `Storage` implementation.
 */
export function createLocalStorageStub(): Storage {
  const entries = new Map<string, string>();

  return {
    get length() {
      return entries.size;
    },
    clear: () => {
      entries.clear();
    },
    getItem: (key: string) => entries.get(key) ?? null,
    key: (index: number) => [...entries.keys()][index] ?? null,
    removeItem: (key: string) => {
      entries.delete(key);
    },
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
  };
}
