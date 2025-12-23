import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface PendingValidation {
  id: string
  audio_play_id?: number
  player_id: number
  player_number: number
  nickname: string
  word: string
  audio_url: string
  uploaded_at: string
}

export const useSupervisorStore = defineStore('supervisor', () => {
  const pendingValidations = ref<PendingValidation[]>([])
  const isActive = ref(false)

  function addValidation(validation: PendingValidation) {
    pendingValidations.value.push(validation)
  }

  function removeValidation(id: string) {
    const index = pendingValidations.value.findIndex((v) => v.id === id)
    if (index !== -1) {
      pendingValidations.value.splice(index, 1)
    }
  }

  function clearValidations() {
    pendingValidations.value = []
  }

  return {
    pendingValidations,
    isActive,
    addValidation,
    removeValidation,
    clearValidations,
  }
})
