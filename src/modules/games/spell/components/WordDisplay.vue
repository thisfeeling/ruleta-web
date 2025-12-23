<script setup lang="ts">
const props = defineProps<{ word?: string | null; masked?: boolean }>()

function displayWord() {
  if (!props.word) return ''
  if (!props.masked) return props.word
  return props.word
    .split('')
    .map(() => '_')
    .join(' ')
}
</script>

<template>
  <div class="word-display">{{ displayWord() }}</div>
</template>

<style scoped>
.word-display {
  font-weight: 700;
  font-size: 1.25rem;
}
</style>
