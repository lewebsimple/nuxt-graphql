<script setup lang="ts">
const { pending, error, data } = await useGraphQLQuery("HelloWorld");
</script>

<template>
  <div v-if="pending">
    Loading...
  </div>
  <div v-else-if="error">
    Error: {{ error.message }}
  </div>
  <div v-else-if="data">
    {{ data.hello }}
  </div>
</template>
