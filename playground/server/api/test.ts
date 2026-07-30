export default defineEventHandler(async (event) => {
  const result = await executeSchemaOperation(event, {
    operationName: "FilmList",
    variables: {},
  });
  return result;
});
