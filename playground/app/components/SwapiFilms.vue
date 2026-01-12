<script setup lang="ts">
const { data, error, pending } = useGraphQLQuery("SwapiFilms");
</script>

<template>
  <div v-if="pending">
    Loading...
  </div>
  <div v-else-if="error">
    Error: {{ error.message }}
  </div>
  <ul v-else-if="data">
    <li
      v-for="(film, index) in data.allFilms?.films || []"
      :key="index"
    >
      {{ film?.title }} — {{ film?.releaseDate }}
    </li>
  </ul>
</template>
