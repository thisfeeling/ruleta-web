<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  score?: number
  compact?: boolean
}

const props = defineProps<Props>()

const display = computed(() => {
  const n = props.score ?? 0
  return new Intl.NumberFormat().format(n)
})
</script>

<template>
  <div class="score-display">
    <span class="score-value" :class="{ compact: props.compact }">{{ display }}</span>
  </div>
</template>

<style scoped>
.score-display {
  font-weight: 700;
}
.score-value.compact {
  font-size: 0.9rem;
}
</style>
