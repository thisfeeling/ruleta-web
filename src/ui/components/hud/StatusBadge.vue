<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{ status?: string; variant?: 'default' | 'success' | 'warning' | 'error' }>(),
  {
    status: 'ok',
    variant: 'default',
  },
)

const variantClass = computed(() => {
  switch (props.variant) {
    case 'success':
      return 'bg-success/10 text-success'
    case 'warning':
      return 'bg-warning/10 text-warning'
    case 'error':
      return 'bg-error/10 text-error'
    default:
      return 'bg-base-200 text-base-content'
  }
})
</script>

<template>
  <span
    :class="['inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', variantClass]"
  >
    {{ props.status }}
  </span>
</template>

<style scoped></style>

<style scoped></style>
