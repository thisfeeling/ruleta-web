<script setup lang="ts">
interface Props {
  disabled?: boolean
  loading?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  loading: false,
  size: 'md',
})
</script>

<template>
  <button
    class="btn btn-ghost"
    :class="[
      `btn-${props.size}`,
      { 'opacity-60 cursor-not-allowed': props.disabled || props.loading, loading: props.loading },
    ]"
    :disabled="props.disabled || props.loading"
  >
    <span v-if="props.loading" class="spinner mr-2" aria-hidden="true"></span>
    <slot />
  </button>
</template>

<style scoped>
.spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(0, 0, 0, 0.08);
  border-top-color: rgba(0, 0, 0, 0.4);
  border-radius: 9999px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
