<script setup lang="ts">
const { data } = await useGraphQLQuery("SwapiFilms");
</script>

<template>
  <ul v-if="data.allFilms">
    <li
      v-for="(film, index) in data.allFilms.films"
      :key="index"
    >
      {{ film?.title }} — {{ film?.releaseDate }}
    </li>
  </ul>
</template>
