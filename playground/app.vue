<script setup lang="ts">
const { request } = useGraphQL();

const data = await request<{ hello: string }>(`
  query {
    hello
  }
`);
</script>

<template>
  <div>
    <h1>{{ data?.hello }}</h1>
  </div>
</template>
