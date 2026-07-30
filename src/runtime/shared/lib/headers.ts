/** Supported values for a single HTTP header entry. */
export type HeaderValue = string | null | undefined;

/** Plain object representation of HTTP headers. */
export type HeadersObject = Record<string, HeaderValue>;

/** Accepted header input shapes used by runtime helpers. */
export type HeadersInput = Headers | HeadersObject | Array<[string, string]> | undefined;

/**
 * Merge multiple header inputs into a single Headers instance.
 *
 * @param inputs Header input objects (later inputs override earlier).
 * @returns Merged Headers instance.
 */
export function mergeHeaders(...inputs: HeadersInput[]): Headers {
  const headers = new Headers();

  for (const input of inputs) {
    if (!input) continue;

    if (input instanceof Headers) {
      for (const [key, value] of input.entries()) {
        headers.set(key, value);
      }
      continue;
    }

    if (Array.isArray(input)) {
      for (const [key, value] of input) {
        headers.set(key, value);
      }
      continue;
    }

    for (const [key, value] of Object.entries(input)) {
      if (value === undefined) continue;
      if (value === null) {
        headers.delete(key);
      } else {
        headers.set(key, value);
      }
    }
  }

  return headers;
}

/**
 * Convert various header input formats into a plain object.
 *
 * @param headers Header input objects.
 * @returns Plain object representation of headers.
 */
export function headersToObject(headers?: HeadersInput): Record<string, string> {
  if (!headers) return {};
  return Object.fromEntries(mergeHeaders(headers).entries());
}

/**
 * Pick a subset of headers by name, case-insensitively on both sides.
 *
 * Header names must be compared with `toLowerCase()` — a word-splitting
 * converter (e.g. es-toolkit's `lowerCase`) turns `"x-api-key"` into
 * `"x api key"` and silently drops every multi-word header.
 *
 * @param headers Incoming headers object (keys in any case).
 * @param names Header names to keep (any case).
 * @returns Headers whose name matches one of `names`.
 */
export function pickHeaders(
  headers: Record<string, string | undefined>,
  names: string[],
): Record<string, string> {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  const picked: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (value !== undefined && wanted.has(key.toLowerCase())) {
      picked[key] = value;
    }
  }

  return picked;
}
