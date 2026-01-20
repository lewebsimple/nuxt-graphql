import { hash } from "ohash";
import { useRequestEvent } from "#imports";

/**
 * Build a unique in-flight key for an operation and variables.
 *
 * @param operationName Operation name.
 * @param variables Operation variables.
 * @returns Unique key used for deduplication.
 */
export function getInFlightKey(operationName: string, variables: unknown): string {
  return `${operationName}:${hash(variables || {})}`;
}

// Shared in-flight requests map for client runtime
const clientInFlightRequests = new Map<string, Promise<unknown>>();

/**
 * Get the in-flight request map scoped to the current runtime.
 *
 * @returns In-flight requests map.
 */
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
