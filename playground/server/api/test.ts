export default defineEventHandler(async (event) => {
  const result = await executeSchemaOperation(event, {
    operationName: "AllFilms",
    variables: {},
  });
  return result;
});
