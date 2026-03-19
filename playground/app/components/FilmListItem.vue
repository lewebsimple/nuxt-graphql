<script setup lang="ts">
import type { FilmListItemFragment } from "#graphql/types";

defineProps<{ film: FilmListItemFragment }>();
</script>

<template>
  <div class="">{{ film.title }}</div>
</template>
