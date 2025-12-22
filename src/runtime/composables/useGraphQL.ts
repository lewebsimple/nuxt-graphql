import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
import { useNuxtApp } from "#imports";

export function useGraphQL() {
  const { $graphql } = useNuxtApp();

  async function request<TResult, TVariables extends Record<string, unknown> | undefined>(
    document: TypedDocumentNode<TResult, TVariables>,
    variables?: TVariables,
  ): Promise<TResult> {
    return $graphql.request({ document, variables });
  }

  return { request };
}
