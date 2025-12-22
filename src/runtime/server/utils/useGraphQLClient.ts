import type { H3Event } from "h3";
import { execute, type DocumentNode, type ExecutionResult } from "graphql";
import { schema } from "#graphql/schema";
import { createContext } from "#graphql/context";

export interface GraphQLClientOptions {
  /**
   * Custom context to merge with the default context
   */
  context?: Record<string, unknown>;
}

export interface GraphQLClient {
  request<TResult = unknown, TVariables = Record<string, unknown>>(
    document: DocumentNode,
    variables?: TVariables,
  ): Promise<TResult>;
}

// Cached client per event (request-scoped)
const clientSymbol = Symbol("graphql-client");

/**
 * Get a GraphQL client for use in server routes/middleware
 * Executes directly against the schema without HTTP roundtrip
 *
 * @param event - H3 event from the server handler
 * @param options - Client options
 *
 * @example
 * ```ts
 * export default defineEventHandler(async (event) => {
 *   const client = useGraphQLClient(event);
 *   const data = await client.request(MyQueryDocument, { id: "123" });
 *   return data;
 * });
 * ```
 */
export function useGraphQLClient(event: H3Event, options: GraphQLClientOptions = {}): GraphQLClient {
  // Return cached client if exists
  const cached = (event.context as Record<symbol, GraphQLClient>)[clientSymbol];
  if (cached) {
    return cached;
  }

  const client: GraphQLClient = {
    async request<TResult = unknown, TVariables = Record<string, unknown>>(
      document: DocumentNode,
      variables?: TVariables,
    ): Promise<TResult> {
      // Create context from event
      const baseContext = await createContext(event);
      const contextValue = options.context
        ? { ...baseContext, ...options.context }
        : baseContext;

      // Execute directly against schema
      const result = await execute({
        schema,
        document,
        variableValues: variables as Record<string, unknown>,
        contextValue,
      }) as ExecutionResult<TResult>;

      if (result.errors?.length) {
        const messages = result.errors.map((e) => e.message).join(", ");
        throw new Error(messages);
      }

      return result.data as TResult;
    },
  };

  // Cache on event context
  (event.context as Record<symbol, GraphQLClient>)[clientSymbol] = client;

  return client;
}
