<script setup lang="ts">
const props = defineProps<{ message?: string }>()
</script>

<template>
  <div class="loading-screen">
    <div class="spinner" aria-hidden></div>
    <div class="text-sm text-muted">{{ props.message ?? 'Loading...' }}</div>
  </div>
</template>

<style scoped>
.loading-screen {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.spinner {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 3px solid var(--color-base-200);
  border-top-color: var(--color-primary);
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
