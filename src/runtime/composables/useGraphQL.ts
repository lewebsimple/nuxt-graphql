import type { RequestDocument, Variables } from "graphql-request";
import { useNuxtApp, useRequestHeaders } from "#imports";

export function useGraphQL() {
  const { $graphql } = useNuxtApp();

  // Forward cookies on server for auth
  if (import.meta.server) {
    const headers = useRequestHeaders(["cookie"]);
    if (headers.cookie) {
      $graphql.setHeader("cookie", headers.cookie);
    }
  }

  return {
    request: <T>(document: RequestDocument, variables?: Variables) => $graphql.request<T>(document, variables),
  };
}
