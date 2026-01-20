/**
 * Header map where:
 * - string  → set / override header
 * - null    → delete header
 */
export type HeadersInput = Record<string, string | null>;

/**
 * Merge multiple header inputs into a single Headers instance.
 *
 * @param inputs Header input objects (later inputs override earlier).
 * @returns Merged Headers instance.
 */
export function mergeHeaders(...inputs: Array<HeadersInput | undefined>): Headers {
  const headers = new Headers();
  for (const input of inputs) {
    if (!input) continue;
    for (const [key, value] of Object.entries(input)) {
      if (value === null) {
        headers.delete(key);
      }
      else {
        headers.set(key, value);
      }
    }
  }
  return headers;
}
