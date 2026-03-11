import { createContext } from "#graphql/context";
import { schema } from "#graphql/schema";
import { execute } from "graphql";
import type { H3Event } from "h3";

import { normalizeError } from "../../shared/utils/error";
import type { ExecuteGraphQLInput, ExecuteGraphQLResult } from "../../shared/utils/execute";
import {
  getOperationDocument,
  parseOperationResult,
  parseOperationVariables,
  type OperationName,
} from "../../shared/utils/registry";

/**
 * Execute a typed / validated GraphQL operation against the schema.
 *
 * @param event Current request event.
 * @param input Operation input payload.
 * @returns Typed operation result or normalized error.
 */
export async function executeSchemaOperation<TName extends OperationName>(
  event: H3Event,
  { operationName, variables }: ExecuteGraphQLInput<TName>,
): Promise<ExecuteGraphQLResult<TName>> {
  try {
    const document = getOperationDocument(operationName);
    const variableValues = parseOperationVariables(operationName, variables);
    const contextValue = await createContext(event);

    const result = await execute({ schema, document, variableValues, operationName, contextValue });

    if (result.errors?.length) {
      return { data: null, error: normalizeError(result.errors) };
    }

    const data = parseOperationResult(operationName, result.data);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: normalizeError(error) };
  }
}
