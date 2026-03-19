<script setup lang="ts">
import FilmItem from "./FilmItem.vue";

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
      <FilmItem :film="film" />
    </li>
  </ul>
  <p v-else-if="error">Error: {{ error.message }}</p>
  <p v-else>Loading...</p>
</template>
