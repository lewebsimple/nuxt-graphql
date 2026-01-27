import type { H3Event } from "h3";
import { execute, parse } from "graphql";
import { createContext } from "#graphql/context";
import { schema } from "#graphql/schema";
import { normalizeError } from "../../shared/lib/error";
import type { ExecuteGraphQLInput, ExecuteGraphQLResult, GraphQLVariables } from "../../shared/lib/types";

export async function executeGraphQLSchema<
  TResult = unknown,
  TVariables extends GraphQLVariables = GraphQLVariables,
>(
  event: H3Event,
  { query, variables, operationName }: ExecuteGraphQLInput<TVariables>,
): Promise<ExecuteGraphQLResult<TResult>> {
  try {
    const contextValue = await createContext(event);
    const result = await execute({
      schema,
      document: typeof query === "string" ? parse(query) : query,
      variableValues: variables,
      operationName,
      contextValue,
    });

    if (result.errors?.length) {
      return { data: null, error: normalizeError(result.errors) };
    }

    return { data: result.data as TResult, error: null };
  }
  catch (error) {
    return { data: null, error: normalizeError(error) };
  }
}
