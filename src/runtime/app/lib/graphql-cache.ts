import { hash } from "ohash";
import { useRequestEvent } from "#imports";
import type { CacheConfig } from "./cache-config";

export type CacheKeyParts = {
  key: string;
  opPrefix: string;
};

// Get cache key and operation prefix from config, operation name, variables and optional scope
export function getCacheKeyParts(
  config: CacheConfig,
  operationName: string,
  variables: unknown,
  scope?: string,
): CacheKeyParts {
  const parts = [config.keyPrefix, config.cacheVersion];
  if (scope) parts.push(scope);
  parts.push(operationName);
  const opPrefix = parts.join(":") + ":"; // trailing sep baked in
  const key = opPrefix + hash(variables || {});
  return { key, opPrefix };
}

// Shared in-flight requests map for client runtime
const clientInFlightRequests = new Map<string, Promise<unknown>>();

// Retrieve the per-request in-flight map on server, or the shared map on client
export function getInFlightRequests() {
  if (import.meta.server) {
    const event = useRequestEvent();
    if (!event) {
      throw new Error("Undefined event context while accessing in-flight requests map on server");
    }
    if (!event.context._graphqlInFlightRequestsMap) {
      event.context._graphqlInFlightRequestsMap = new Map<string, Promise<unknown>>();
    }
    return event.context._graphqlInFlightRequestsMap as Map<string, Promise<unknown>>;
  }

  return clientInFlightRequests;
}
