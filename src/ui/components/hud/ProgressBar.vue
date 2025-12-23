<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ value?: number; max?: number }>(), {
  value: 0,
  max: 100,
})

const percent = computed(() => Math.min(100, Math.max(0, (props.value / props.max) * 100)))
</script>

<template>
  <div class="w-full bg-base-300 h-3 rounded-full overflow-hidden">
    <div class="h-full bg-primary transition-all" :style="{ width: percent + '%' }" />
  </div>
</template>

<style scoped></style>
