<script setup lang="ts">
import { computed } from 'vue'
import AchievementToast from './AchievementToast.vue'
import { useAchievementsStore } from './achievements.store'

const store = useAchievementsStore()
const toasts = computed(() => store.toasts)

function closeToast(toastId: string) {
  store.dismissToast(toastId)
}
</script>

<template>
  <div class="achievement-toasts-container" aria-live="polite">
    <transition-group name="toast" tag="div">
      <div v-for="toast in toasts" :key="toast.toastId" class="toast-item">
        <AchievementToast
          :achievement="toast.achievement"
          @close="() => closeToast(toast.toastId)"
        />
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.achievement-toasts-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}
.toast-enter-active,
.toast-leave-active {
  transition: all 180ms ease;
}

.toast-item {
  display: block;
}
</style>
