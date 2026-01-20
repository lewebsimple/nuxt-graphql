<script setup lang="ts">
import type { Films } from "#graphql/fragments";

defineProps<Films>();
</script>

<template>
  <ul>
    <li
      v-for="(film, index) in films"
      :key="index"
    >
      <strong>{{ film?.title }}</strong> - Directed by {{ film?.director }}
    </li>
  </ul>
</template>
