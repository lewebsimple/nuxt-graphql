import type { ExecutionRequest, ExecutionResult } from "@graphql-tools/utils";

export type GraphQLRemoteExecHooks = {
  onRequest?: (request: ExecutionRequest) => void | Promise<void>;
  onResult?: (result: ExecutionResult) => void | Promise<void>;
  onError?: (error: unknown) => void | Promise<void>;
};

/**
 * Define remote executor hooks with proper typing.
 *
 * @param hooks Hooks implementation.
 * @returns The same hooks object.
 */
export function defineRemoteExecutorHooks(hooks: GraphQLRemoteExecHooks): GraphQLRemoteExecHooks {
  return hooks;
}
