<script setup lang="ts">
const props = defineProps<{ message?: string }>()
</script>

<template>
  <div class="passed-screen">
    <h2 class="text-xl font-bold">Passed</h2>
    <p class="text-sm text-muted">{{ props.message ?? '' }}</p>
    <slot name="actions"></slot>
  </div>
</template>

<style scoped>
.passed-screen {
  text-align: center;
}
</style>
