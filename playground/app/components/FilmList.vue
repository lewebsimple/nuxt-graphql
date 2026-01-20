<script setup lang="ts">
import type { FilmsFragment } from "#graphql/fragments";

defineProps<FilmsFragment>();
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
