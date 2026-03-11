<script setup lang="ts">
const { data: films, error } = await useAsyncGraphQLQuery(
  "AllFilms",
  {},
  {
    transform: ({ allFilms }) => allFilms?.films || [],
  },
);
</script>

<template>
  <ul v-if="films">
    <li v-for="(film, key) in films" :key="key">
      {{ film?.title || "Unknown" }}
    </li>
  </ul>
  <p v-else-if="error">Error: {{ error.message }}</p>
  <p v-else>Loading...</p>
</template>
