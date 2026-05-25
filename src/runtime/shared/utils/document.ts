import { parse, print, type DocumentNode } from "graphql";

/**
 * Serialize a GraphQL document to a query string.
 *
 * Accepts both string-form documents (emitted by codegen string mode as
 * `TypedDocumentString`, which extends `String`) and AST `DocumentNode`s.
 */
export function printDocument(document: unknown): string {
  if (typeof document === "string" || document instanceof String) {
    return String(document);
  }
  return print(document as DocumentNode);
}

const astCache = new WeakMap<object, DocumentNode>();
const astStringCache = new Map<string, DocumentNode>();

/**
 * Parse a document into a `DocumentNode` AST, caching by reference.
 *
 * The string-mode codegen emits each operation as a `TypedDocumentString`
 * instance whose identity is stable across calls, so a `WeakMap` keyed on the
 * instance avoids re-parsing on every request. Raw string sources fall back to
 * a `Map` keyed on the SDL text, deduplicating equal queries while keeping the
 * cache bounded by the number of distinct operations.
 */
export function parseDocument(document: unknown): DocumentNode {
  if (typeof document === "string") {
    let ast = astStringCache.get(document);
    if (!ast) {
      ast = parse(document);
      astStringCache.set(document, ast);
    }
    return ast;
  }
  if (document instanceof String || (typeof document === "object" && document !== null)) {
    const obj = document as object;
    const cached = astCache.get(obj);
    if (cached) {
      return cached;
    }
    if (document instanceof String) {
      const ast = parse(String(document));
      astCache.set(obj, ast);
      return ast;
    }
    // Already an AST DocumentNode
    return document as DocumentNode;
  }
  throw new TypeError("Cannot parse document: unsupported type");
}
