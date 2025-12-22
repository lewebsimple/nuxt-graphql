export default defineEventHandler(async (event) => {
  const data = await useGraphQLQuery(event, "Hello");
  return { message: data.hello };
});
