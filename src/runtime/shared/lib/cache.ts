// Default GraphQL cache configuration
import { hash } from "ohash";

const defaultCacheConfig: GraphQLCacheConfig = {
  keyPrefix: "gql",
  keyVersion: "1",
  policy: "no-cache",
  ttl: undefined,
};

/**
 * Merge the default cache config with user overrides.
 *
 * @param overrides Partial cache config overrides.
 * @returns Resolved cache configuration.
 */
export function resolveCacheConfig(...overrides: Array<Partial<GraphQLCacheConfig> | undefined>): GraphQLCacheConfig {
  return Object.assign({}, defaultCacheConfig, ...overrides);
}

type CacheKeyParts = {
  key: string;
  opPrefix: string;
};

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
  { keyPrefix, keyVersion }: GraphQLCacheConfig,
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
