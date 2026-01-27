import type { GraphQLRemoteExecHooks } from "../lib/remote-executor";

/**
 * Define remote executor hooks with proper typing.
 *
 * @param hooks Hooks implementation.
 * @returns The same hooks object.
 */
export function defineRemoteExecutorHooks(hooks: GraphQLRemoteExecHooks): GraphQLRemoteExecHooks {
  return hooks;
}
