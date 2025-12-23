<template>
  <div class="word-list p-2">
    <ul class="grid grid-cols-2 gap-2">
      <li v-for="w in words" :key="w" :class="found.has(w) ? 'line-through text-gray-400' : ''">
        {{ w }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ words: string[]; found: Set<string> }>()
const words = props.words || []
const found = props.found || new Set<string>()
</script>

<style scoped>
.word-list {
}
</style>
