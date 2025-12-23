<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'

const emit = defineEmits(['close'])

function onOverlayClick(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
    emit('close')
  }
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="modal-overlay" @click="onOverlayClick">
    <div class="base-modal">
      <header class="modal-header">
        <slot name="header"></slot>
        <button class="btn btn-ghost btn-sm" @click="$emit('close')">✕</button>
      </header>

      <section class="modal-body">
        <slot />
      </section>

      <footer class="modal-footer">
        <slot name="footer"></slot>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1000;
}
.base-modal {
  background: var(--color-base-100);
  border-radius: 8px;
  min-width: 320px;
  max-width: 90vw;
  padding: 1rem;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}
.modal-body {
  margin-bottom: 0.5rem;
}
</style>
