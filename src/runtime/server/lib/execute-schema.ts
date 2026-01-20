import { execute } from "graphql";
import type { H3Event } from "h3";
import type { VariablesOf, ResultOf, QueryName, MutationName } from "#graphql/registry";
import { createContext } from "#graphql/context";
import { schema } from "#graphql/schema";
import { normalizeError } from "../../shared/lib/error";
import { getOperationDocument } from "../../shared/lib/registry";

/**
 * Execute a GraphQL operation directly against the stitched schema.
 *
 * @param event H3 event for context creation.
 * @param operationName Operation name from the registry.
 * @param variables Operation variables.
 * @returns Operation result data.
 */
export async function executeGraphQLSchema<TName extends QueryName | MutationName>(
  event: H3Event,
  operationName: TName,
  variables: VariablesOf<TName>,
): Promise<ResultOf<TName>> {
  const document = getOperationDocument(operationName);

  const result = await execute({
    schema,
    document,
    variableValues: variables,
    contextValue: await createContext(event),
  });

  if (result.errors?.length) {
    throw normalizeError(result.errors);
  }

  if (!result.data) {
    throw normalizeError(
      new Error("GraphQL execution returned no data"),
    );
  }

  return result.data as ResultOf<TName>;
}
