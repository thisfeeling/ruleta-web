<script setup lang="ts">
import { computed } from 'vue'
import AchievementToast from './AchievementToast.vue'
import { useAchievementsStore } from './achievements.store'

const TOAST_DURATION = 5000
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
          :duration="TOAST_DURATION"
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
  pointer-events: auto;
}

/* Mobile: move to bottom center and use compact layout */
@media (max-width: 640px) {
  .achievement-toasts-container {
    top: auto;
    bottom: 1rem;
    left: 50%;
    right: auto;
    transform: translateX(-50%);
    width: calc(100% - 2rem);
    align-items: center;
  }

  .toast-item {
    width: 100%;
    max-width: 360px;
  }
}
</style>
