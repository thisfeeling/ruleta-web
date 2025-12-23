<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ tension?: number }>()
const pct = computed(() => Math.round((props.tension ?? 0) * 100))
</script>

<template>
  <div class="tension-meter">
    <div class="bar" :style="{ width: pct + '%' }"></div>
  </div>
  <div class="text-xs mt-1">{{ pct }}%</div>
</template>

<style scoped>
.tension-meter {
  width: 100%;
  height: 8px;
  background: var(--color-base-200);
  border-radius: 999px;
  overflow: hidden;
}
.tension-meter .bar {
  height: 100%;
  background: var(--color-primary);
}
</style>
