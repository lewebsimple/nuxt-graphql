<script setup lang="ts">
const { data } = useGraphQLSubscription("Time");
</script>

<template>
  <div v-if="data?.time">
    {{ data.time }}
  </div>
</template>
