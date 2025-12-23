<script setup lang="ts">
const props = defineProps<{ status?: 'pending' | 'accepted' | 'approved' | 'rejected' | null }>()
const state = props.status === 'approved' ? 'accepted' : props.status
const label = state === 'accepted' ? 'Accepted' : state === 'rejected' ? 'Rejected' : 'Pending'
const cls =
  state === 'accepted' ? 'badge-success' : state === 'rejected' ? 'badge-error' : 'badge-ghost'
</script>

<template>
  <div class="validation-status">
    <span :class="['badge', cls]">{{ label }}</span>
  </div>
</template>

<style scoped>
.validation-status {
}
</style>
