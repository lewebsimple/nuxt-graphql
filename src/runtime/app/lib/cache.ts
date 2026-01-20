import { hash } from "ohash";
import type { CacheConfig } from "../../shared/lib/cache-config";

type CacheKeyParts = {
  key: string;
  opPrefix: string;
};

/**
 * Build cache key parts from config, operation name, and variables.
 *
 * @param {CacheConfig} options Cache configuration.
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
