<script setup lang="ts">
const props = withDefaults(defineProps<{ title?: string; message?: string }>(), {
  title: 'Información',
  message: '',
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

function close() {
  emit('close')
}
</script>

<template>
  <div class="p-4">
    <div class="flex justify-between items-start">
      <h3 class="text-lg font-bold">{{ props.title }}</h3>
      <button class="btn btn-ghost btn-xs" @click="close">✕</button>
    </div>
    <p class="mt-2">{{ props.message }}</p>
  </div>
</template>

<style scoped></style>
