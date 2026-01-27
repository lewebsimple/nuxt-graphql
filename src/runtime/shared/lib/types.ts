import type { DocumentNode } from "graphql";
import type { NormalizedError } from "./error";

export type GraphQLVariables = Record<string, unknown>;

export type ExecuteGraphQLInput<TVariables extends GraphQLVariables = GraphQLVariables> = {
  query: DocumentNode | string;
  variables?: TVariables;
  operationName?: string;
};

export type ExecuteGraphQLResult<TResult> = { data: TResult; error: null } | { data: null; error: NormalizedError };

export type IsEmptyObject<T> = [T] extends [never] ? true : T extends object ? keyof T extends never ? true : false : false;
