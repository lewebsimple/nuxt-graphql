<script setup lang="ts">
const { data, error } = await useGraphQLQuery("Hello");
</script>

<template>
  <div v-if="error">
    <pre>{{ error }}</pre>
  </div>
  <div v-else>
    {{ data.hello }}
  </div>
</template>
