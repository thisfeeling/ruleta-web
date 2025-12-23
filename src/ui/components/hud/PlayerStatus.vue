<script setup lang="ts">
const props = defineProps<{ status?: 'alive' | 'eliminated' | 'connecting' }>()

const label =
  props.status === 'alive' ? 'Alive' : props.status === 'eliminated' ? 'Eliminated' : 'Connecting'
const cls =
  props.status === 'alive'
    ? 'badge-success'
    : props.status === 'eliminated'
      ? 'badge-error'
      : 'badge-ghost'
</script>

<template>
  <div class="player-status">
    <span :class="['badge', cls]">{{ label }}</span>
  </div>
</template>

<style scoped>
.player-status {
}
</style>
