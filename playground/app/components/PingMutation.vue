<script setup lang="ts">
const { mutate } = useGraphQLMutation("Ping", {
  headers: {
    "X-Request-Header": "request-header-value",
  },
});

async function onClick() {
  const { data, error } = await mutate({ message: Math.random().toString() }, {
    headers: {
      "X-Mutate-Header": "mutate-header-value",
    },
  });
  if (error) {
    console.error(error);
    return;
  }
  alert(data.ping);
}
</script>

<template>
  <div>
    <button @click="onClick">
      Ping
    </button>
  </div>
</template>
