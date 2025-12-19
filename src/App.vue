<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header>
    

    <div class="wrapper">


      <h1 class="text-3xl font-bold underline bg-sky-200 p-4 mt-4 text-amber-950 rounded-2xl">
        Hello world!
      </h1>

      <button class="btn btn-square">
        <span class="loading loading-spinner"></span>
      </button>

      <nav>
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/about">About</RouterLink>
      </nav>
    </div>
  </header>

  <RouterView />
</template>

<style scoped></style>
