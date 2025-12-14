import type { RequestDocument, Variables } from "graphql-request";
import { useNuxtApp } from "#imports";

export function useGraphQL() {
  const { $graphql } = useNuxtApp();

  return {
    request: <T>(document: RequestDocument, variables?: Variables) => $graphql.request<T>(document, variables),
  };
}
