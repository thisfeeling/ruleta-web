<script setup lang="ts">
import { useUIStore } from '@/modules/core/stores/ui.store'

const uiStore = useUIStore()
</script>

<template>
  <Teleport to="body">
    <div>
      <TransitionGroup name="modal">
        <div
          v-for="modal in uiStore.modals"
          :key="modal.id"
          class="modal modal-open"
          @click.self="modal.persistent ? null : uiStore.closeModal(modal.id)"
        >
          <div class="modal-box">
            <component :is="modal.component" v-bind="modal.props" />
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
