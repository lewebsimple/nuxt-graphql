import type { H3Event } from "h3";
import { getRequestHeader } from "h3";

// Extract forwardable headers from H3 event (server only)
export function getClientForwardHeaders(event: H3Event): HeadersInit | undefined {
  if (import.meta.client) return undefined;
  const allowedHeaders = [
    "accept-language",
    "authorization",
    "cookie",
    "user-agent",
    "x-forwarded-for",
    "x-forwarded-host",
    "x-forwarded-proto",
    "x-request-id",
  ];

  const headers = new Headers();
  let hasHeaders = false;
  for (const header of allowedHeaders) {
    const value = getRequestHeader(event, header);
    if (value) {
      headers.set(header, Array.isArray(value) ? value.join(", ") : value);
      hasHeaders = true;
    }
  }

  return hasHeaders ? headers : undefined;
}

// Merge multiple HeadersInit into one
export function mergeHeaders(...headers: Array<HeadersInit | undefined>): HeadersInit | undefined {
  const present = headers.filter(Boolean) as HeadersInit[];
  if (present.length === 0) return undefined;
  if (present.length === 1) return present[0];

  if (typeof Headers === "undefined") {
    throw new TypeError("mergeHeaders: Node 18+ is required (global Headers is not available).");
  }

  const merged = new Headers();
  for (const headerInit of present) {
    for (const [key, value] of new Headers(headerInit).entries()) {
      merged.set(key, value);
    }
  }

  return merged;
}
