<script setup lang="ts">
const version =
  (import.meta as any).env?.VITE_APP_VERSION ||
  (import.meta as any).env?.npm_package_version ||
  'dev'
</script>

<template>
  <div class="version-display">v{{ version }}</div>
</template>

<style scoped>
.version-display {
  font-size: 0.85rem;
  opacity: 0.8;
}
</style>
