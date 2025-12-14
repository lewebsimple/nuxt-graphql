<script setup lang="ts">
const { data } = await useGraphQLQuery("Hello");
</script>

<template>
  <div>
    <h1 v-if="data">
      {{ data?.hello }}
    </h1>
  </div>
</template>
