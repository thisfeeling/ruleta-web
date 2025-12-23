<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ events?: Array<{ id: string; at: string; text: string }> }>()
const items = computed(() => props.events ?? [])
</script>

<template>
  <div class="player-timeline">
    <ul>
      <li v-for="e in items" :key="e.id" class="timeline-item">
        <div class="time text-xs text-muted">{{ new Date(e.at).toLocaleTimeString() }}</div>
        <div class="text">{{ e.text }}</div>
      </li>
    </ul>
    <div v-if="items.length === 0" class="text-sm text-muted">No events</div>
  </div>
</template>

<style scoped>
.player-timeline {
  padding: 0.5rem;
}
.timeline-item {
  padding: 0.5rem 0;
  border-bottom: 1px dashed var(--color-base-200);
}
</style>
