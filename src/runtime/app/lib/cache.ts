import { hash } from "ohash";
import type { CacheConfig } from "../../shared/lib/types";

// Default GraphQL cache configuration
const defaultCacheConfig: CacheConfig = {
  policy: "no-cache",
  ttl: undefined,
  keyPrefix: "gql",
  keyVersion: "1",
};

/**
 * Resolve cache config from default value with user overrides.
 *
 * @param overrides Partial cache config overrides.
 * @returns Resolved cache configuration.
 */
export function resolveCacheConfig(...overrides: Array<Partial<CacheConfig> | undefined>): CacheConfig {
  return Object.assign({}, defaultCacheConfig, ...overrides);
}

type CacheKeyParts = { key: string; opPrefix: string };

/**
 * Build cache key parts from config, operation name, and variables.
 *
 * @param {GraphQLCacheConfig} options Cache configuration.
 * @param options.keyPrefix Cache key prefix.
 * @param options.keyVersion Cache key version.
 * @param operationName Operation name.
 * @param variables Operation variables.
 * @param scope Optional cache scope segment.
 * @returns Key parts including full key and operation prefix.
 */
export function getCacheKeyParts(
  { keyPrefix, keyVersion }: CacheConfig,
  operationName: string,
  variables: unknown,
  scope?: string,
): CacheKeyParts {
  const parts = [keyPrefix, keyVersion];
  if (scope) parts.push(scope);
  parts.push(operationName);
  const opPrefix = parts.join(":") + ":";
  const key = opPrefix + hash(variables || {});
  return { key, opPrefix };
}
