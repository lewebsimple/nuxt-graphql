<script setup lang="ts">
const { data } = await useGraphQLQuery("Hello");
</script>

<template>
  <div>{{ data.hello }}</div>
</template>
