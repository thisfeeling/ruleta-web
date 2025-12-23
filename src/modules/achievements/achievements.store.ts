import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  unlocked_at: string
}

export const useAchievementsStore = defineStore('achievements', () => {
  const achievements = ref<Achievement[]>([])
  const unlockedIds = ref<Set<string>>(new Set())

  // Toasts queue for UI notifications
  const toasts = ref<Array<{ toastId: string; achievement: Achievement }>>([])
  const TOAST_DURATION = 5000

  function unlock(achievement: Achievement) {
    if (!unlockedIds.value.has(achievement.id)) {
      achievements.value.push(achievement)
      unlockedIds.value.add(achievement.id)
      // Show a toast when a new achievement is unlocked
      showToast(achievement)
    }
  }

  function showToast(achievement: Achievement) {
    const toastId = `${achievement.id}-${Date.now()}`
    toasts.value.push({ toastId, achievement })

    // Auto dismiss after duration
    setTimeout(() => {
      dismissToast(toastId)
    }, TOAST_DURATION)
  }

  function dismissToast(toastId: string) {
    const idx = toasts.value.findIndex((t) => t.toastId === toastId)
    if (idx !== -1) toasts.value.splice(idx, 1)
  }

  return { achievements, unlockedIds, toasts, unlock, showToast, dismissToast }
})
