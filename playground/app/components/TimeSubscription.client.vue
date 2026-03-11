<script setup lang="ts">
const { data, error } = useGraphQLSubscription("Time", {});
</script>

<template>
  <pre>{{ data?.time || error || "Loading..." }}</pre>
</template>
