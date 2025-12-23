<script setup lang="ts">
const props = defineProps<{ message?: string }>()
</script>

<template>
  <div class="error-screen">
    <h2 class="text-xl font-bold">Error</h2>
    <p class="text-sm text-muted">{{ props.message ?? 'An error occurred' }}</p>
    <slot name="actions"></slot>
  </div>
</template>

<style scoped>
.error-screen {
  text-align: center;
}
</style>
