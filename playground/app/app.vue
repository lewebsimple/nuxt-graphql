<script setup lang="ts">
const { data, error } = await useGraphQLQuery("AllFilms");
if (error) throw new Error(error.message);
</script>

<template>
  <div>
    Nuxt GraphQL module playground!
    <FilmList
      v-if="data.allFilms?.films"
      :films="data.allFilms.films"
    />
  </div>
</template>
