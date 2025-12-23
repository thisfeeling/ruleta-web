import { defineStore } from 'pinia'
import { ref } from 'vue'

interface Player {
  id: number
  nickname?: string
}

interface SpellState {
  currentWord: string | null
  currentPlayer: Player | null
  timeLeft: number
  audioBlob: Blob | null
  audioUrl: string | null
  isRecording: boolean
  isValidating: boolean
  validationResult: 'pending' | 'approved' | 'rejected' | null
}

const initialState: SpellState = {
  currentWord: null,
  currentPlayer: null,
  timeLeft: 0,
  audioBlob: null,
  audioUrl: null,
  isRecording: false,
  isValidating: false,
  validationResult: null,
}

export const useSpellStore = defineStore('spell', () => {
  const state = ref<SpellState>({ ...initialState })

  function assignWord(word: string, player: Player) {
    state.value.currentWord = word
    state.value.currentPlayer = player
    state.value.validationResult = 'pending'
  }

  function setAudio(blob: Blob, url?: string) {
    state.value.audioBlob = blob
    state.value.audioUrl = url || null
  }

  function setValidation(result: 'approved' | 'rejected') {
    state.value.validationResult = result
    state.value.isValidating = false
  }

  function reset() {
    state.value = { ...initialState }
  }

  return { state, assignWord, setAudio, setValidation, reset }
})
