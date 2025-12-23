export default defineEventHandler(async (event) => {
  const data = await useServerGraphQLQuery(event, "Hello");
  return { message: data.hello };
});
