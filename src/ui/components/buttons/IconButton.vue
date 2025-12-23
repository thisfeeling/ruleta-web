<script setup lang="ts">
interface Props {
  disabled?: boolean
  loading?: boolean
  size?: 'sm' | 'md' | 'lg'
  ariaLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  loading: false,
  size: 'md',
  ariaLabel: 'icon-button',
})
</script>

<template>
  <button
    :aria-label="props.ariaLabel"
    class="btn btn-ghost"
    :class="[
      `btn-${props.size}`,
      { 'opacity-60 cursor-not-allowed': props.disabled || props.loading },
    ]"
    :disabled="props.disabled || props.loading"
  >
    <slot />
  </button>
</template>

<style scoped>
/* Lightweight icon button styling */
</style>
