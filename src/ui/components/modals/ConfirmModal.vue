<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title?: string
    message?: string
    confirmLabel?: string
    cancelLabel?: string
  }>(),
  {
    title: 'Confirmar',
    message: '',
    confirmLabel: 'Confirmar',
    cancelLabel: 'Cancelar',
  },
)

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

function onConfirm() {
  emit('confirm')
}

function onCancel() {
  emit('cancel')
}
</script>

<template>
  <div class="p-4">
    <h3 class="text-lg font-bold">{{ props.title }}</h3>
    <p class="mt-2">{{ props.message }}</p>

    <div class="mt-4 flex justify-end gap-2">
      <button class="btn btn-ghost" @click="onCancel">{{ props.cancelLabel }}</button>
      <button class="btn btn-primary" @click="onConfirm">{{ props.confirmLabel }}</button>
    </div>
  </div>
</template>

<style scoped></style>
