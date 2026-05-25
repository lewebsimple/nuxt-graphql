import { createContext } from "#graphql/context";
import { executor, getSchema } from "#graphql/schema";
import { execute, type ExecutionResult } from "graphql";
import type { H3Event } from "h3";

import { parseDocument } from "../../shared/utils/document";
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
 * In passthrough mode (single remote subschema, no local schema), execution
 * is forwarded directly to the remote executor — `graphql.execute` is skipped
 * along with the schema's resolver walk. Otherwise the operation runs against
 * the local executable schema in-process.
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

    // In passthrough mode the schema is never materialized here — the executor
    // branch wins and `getSchema()` is not called. Outside passthrough,
    // `getSchema()` lazily constructs the schema on first call and memoizes it.
    const result = executor
      ? ((await executor({
          document,
          variables: variableValues,
          operationName,
          context: contextValue,
        })) as ExecutionResult)
      : await execute({
          schema: getSchema(),
          document: parseDocument(document),
          variableValues,
          operationName,
          contextValue,
        });

    if (result.errors?.length) {
      return { data: null, error: normalizeError(result.errors) };
    }

    const data = parseOperationResult(operationName, result.data);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: normalizeError(error) };
  }
}
