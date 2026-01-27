<script setup lang="ts">
const { data } = await useAsyncGraphQLQuery("AllFilms", {});
</script>

<template>
  <div>
    Nuxt GraphQL module playground!
    <FilmList
      v-if="data?.allFilms?.films"
      :films="data.allFilms.films"
    />
  </div>
</template>
