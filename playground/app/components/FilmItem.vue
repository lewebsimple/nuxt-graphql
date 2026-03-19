<script setup lang="ts">
import type { FilmFragment } from "#graphql/types";

defineProps<{ film?: FilmFragment | null }>();
</script>

<template>
  <div class="">{{ film?.title || "(Unknown)" }}</div>
</template>
