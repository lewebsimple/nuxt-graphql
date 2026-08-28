import { defineNuxtPlugin, useRequestHeaders, useRuntimeConfig } from "#app";

import { pickHeaders } from "../../shared/lib/headers";
import {
  executeHttpOperation,
  type ExecuteGraphQLInput,
  type ExecuteGraphQLResult,
} from "../../shared/utils/execute";
import type { OperationName } from "../../shared/utils/registry";
import { getCacheRootPrefix } from "../lib/cache";
import { resolveCacheConfig } from "../lib/cache-config";
import { purgePersistedOtherVersions } from "../lib/persisted";

/**
 * Nuxt plugin that provides a GraphQL operation executor.
 *
 * @returns Nuxt plugin with GraphQL operation executor.
 */
export default defineNuxtPlugin(() => {
  const { ssrForwardHeaders, cacheConfig } = useRuntimeConfig().public.graphql;

  // Sweep persisted entries from other key versions once per client session: expiration only
  // deletes an entry when it is read, and a bumped `keyVersion` means the old keys are never
  // read again — without this, every release leaves its whole cache orphaned in localStorage.
  if (import.meta.client) {
    const resolved = resolveCacheConfig(cacheConfig);
    void purgePersistedOtherVersions(resolved.keyPrefix, getCacheRootPrefix(resolved));
  }

  async function executeOperation<TName extends OperationName>(input: ExecuteGraphQLInput<TName>) {
    return executeHttpOperation(input, {
      endpoint: "/api/graphql",
      headers: import.meta.server ? pickHeaders(useRequestHeaders(), ssrForwardHeaders) : {},
    });
  }

  return { provide: { executeOperation } };
});

type ExecuteGraphQL = <TName extends OperationName>(
  input: ExecuteGraphQLInput<TName>,
) => Promise<ExecuteGraphQLResult<TName>>;

declare module "#app/nuxt" {
  interface NuxtApp {
    $executeOperation: ExecuteGraphQL;
  }
}

declare module "#app" {
  interface NuxtApp {
    $executeOperation: ExecuteGraphQL;
  }
}
