<script setup lang="ts">
const { mutate } = useGraphQLMutation("Ping");
async function onClick() {
  const { data, error } = await mutate();
  if (error) {
    console.error(error);
    return;
  }
  alert(data?.ping);
}
</script>

<template>
  <div>
    <button @click="onClick">
      Ping
    </button>
  </div>
</template>
