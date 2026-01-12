export default defineEventHandler(async (event) => {
  // Server-side GraphQL query example
  const { hello } = await useServerGraphQLQuery(event, "HelloWorld", undefined, {
    headers: {
      "X-Server-Header": "server-header-value",
    },
  });

  // Server-side GraphQL mutation example
  const { mutate } = useServerGraphQLMutation(event, "Ping", {
    headers: {
      "X-Server-Header": "server-header-value",
    },
  });
  const { ping } = await mutate({ message: hello }, {
    headers: {
      "X-Mutation-Header": "mutation-header-value",
    },
  });

  return { ping };
});
