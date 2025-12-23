<script setup lang="ts">
const props = defineProps<{ name?: string; players?: number; active?: boolean }>()
</script>

<template>
  <div class="group-indicator" :class="{ active: props.active }">
    <div class="group-name">{{ props.name ?? 'Group' }}</div>
    <div class="group-players text-sm text-muted">{{ props.players ?? 0 }} players</div>
  </div>
</template>

<style scoped>
.group-indicator {
  padding: 0.5rem;
  border-radius: 6px;
  background: var(--color-base-100);
}
.group-indicator.active {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.08);
}
.group-name {
  font-weight: 700;
}
</style>
