<script setup lang="ts">
const { data } = await useGraphQLQuery("CurrentTime");
</script>

<template>
  <div>
    Current time: <span v-if="data.currentTime">{{ data.currentTime }}</span>
  </div>
</template>
