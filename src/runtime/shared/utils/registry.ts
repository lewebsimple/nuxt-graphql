import type * as z from "zod";

import { enums, fragments, operations } from "#graphql/registry";

// ─────────────────────────────────────────────────────────────
// Registry type helpers
// ─────────────────────────────────────────────────────────────

type Enums = typeof enums;

/** Available enum names generated in the GraphQL registry. */
export type EnumName = keyof Enums;

/** Inferred enum value type for a registry enum entry. */
export type EnumOf<T extends EnumName> = z.infer<Enums[T]["schema"]>;

type Fragments = typeof fragments;

/** Available fragment names generated in the GraphQL registry. */
export type FragmentName = keyof Fragments;

/** Inferred fragment payload type for a registry fragment entry. */
export type FragmentOf<T extends FragmentName> = z.infer<Fragments[T]["schema"]>;

type Operations = typeof operations;

/** Available operation names generated in the GraphQL registry. */
export type OperationName = keyof Operations;
type OperationNameOf<TKind extends Operations[OperationName]["kind"]> = {
  [TName in OperationName]: Operations[TName]["kind"] extends TKind ? TName : never;
}[OperationName];

/** Operation names constrained to GraphQL queries. */
export type QueryName = OperationNameOf<"query">;

/** Operation names constrained to GraphQL mutations. */
export type MutationName = OperationNameOf<"mutation">;

/** Operation names constrained to GraphQL subscriptions. */
export type SubscriptionName = OperationNameOf<"subscription">;

/** Typed GraphQL document for an operation. */
export type DocumentOf<T extends OperationName> = Operations[T]["document"];

/** Typed operation result payload. */
export type ResultOf<T extends OperationName> = z.infer<Operations[T]["resultSchema"]>;

/** Parsed operation variable payload. */
export type VariablesOf<T extends OperationName> = z.infer<Operations[T]["variablesSchema"]>;

/** Input operation variable payload. */
export type VariablesInputOf<T extends OperationName> = z.input<Operations[T]["variablesSchema"]>;

// ─────────────────────────────────────────────────────────────
// Registry entry helpers (internal)
// ─────────────────────────────────────────────────────────────

function getEnumEntry<T extends EnumName>(name: T) {
  const entry = enums[name];
  if (!entry) {
    throw new Error(`Enum "${name}" not found in registry.`);
  }
  return entry;
}

function getFragmentEntry<T extends FragmentName>(name: T) {
  const entry = fragments[name];
  if (!entry) {
    throw new Error(`Fragment "${name}" not found in registry.`);
  }
  return entry;
}

function getOperationEntry<T extends OperationName>(name: T) {
  const entry = operations[name];
  if (!entry) {
    throw new Error(`Operation "${name}" not found in registry.`);
  }
  return entry;
}

// ─────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────

/**
 * Parse an enum value using the generated registry schema.
 *
 * @param name Enum name.
 * @param value Value to parse.
 * @returns Parsed enum value.
 */
export function parseEnum<T extends EnumName>(name: T, value: unknown): EnumOf<T> {
  return getEnumEntry(name).schema.parse(value) as EnumOf<T>;
}

// ─────────────────────────────────────────────────────────────
// Fragments
// ─────────────────────────────────────────────────────────────

/**
 * Parse a fragment value using the generated registry schema.
 *
 * @param name Fragment name.
 * @param value Value to parse.
 * @returns Parsed fragment value.
 */
export function parseFragment<T extends FragmentName>(name: T, value: unknown): FragmentOf<T> {
  return getFragmentEntry(name).schema.parse(value) as FragmentOf<T>;
}

// ─────────────────────────────────────────────────────────────
// Operations
// ─────────────────────────────────────────────────────────────

/**
 * Get the typed document node for an operation.
 *
 * @param name Operation name.
 * @returns Typed operation document.
 */
export function getOperationDocument<T extends OperationName>(name: T): DocumentOf<T> {
  return getOperationEntry(name).document;
}

/**
 * Parse operation result data using the generated result schema.
 *
 * @param name Operation name.
 * @param value Result payload to parse.
 * @returns Parsed operation result.
 */
export function parseOperationResult<T extends OperationName>(
  name: T,
  value: unknown,
): ResultOf<T> {
  return getOperationEntry(name).resultSchema.parse(value) as ResultOf<T>;
}

/**
 * Parse operation variables using the generated variables schema.
 *
 * @param name Operation name.
 * @param value Variable payload to parse.
 * @returns Parsed operation variables.
 */
export function parseOperationVariables<T extends OperationName>(
  name: T,
  value: unknown,
): VariablesOf<T> {
  return getOperationEntry(name).variablesSchema.parse(value) as VariablesOf<T>;
}
