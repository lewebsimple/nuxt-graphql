<script setup lang="ts">
const { pending, mutate } = useGraphQLMutation("Ping");
async function onClick() {
  console.log(await mutate({}));
}
</script>

<template>
  <button @click="onClick" :disabled="pending">Ping</button>
</template>
