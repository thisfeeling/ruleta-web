import { defineStore } from 'pinia'
import { ref } from 'vue'

export type RoundPhase = 'setup' | 'playing' | 'results' | 'complete'

export interface RoundState {
  number: number
  game: string | null
  phase: RoundPhase
  startedAt: string | null
  endedAt: string | null
  eliminationsCount: number
  passedCount: number
}

export const useRoundStore = defineStore('round', () => {
  const state = ref<RoundState>({
    number: 0,
    game: null,
    phase: 'setup',
    startedAt: null,
    endedAt: null,
    eliminationsCount: 0,
    passedCount: 0,
  })

  function startRound(game: string, number: number) {
    state.value.number = number
    state.value.game = game
    state.value.phase = 'playing'
    state.value.startedAt = new Date().toISOString()
    state.value.endedAt = null
    state.value.eliminationsCount = 0
    state.value.passedCount = 0
  }

  function setPhase(phase: RoundPhase) {
    state.value.phase = phase
  }

  function recordElimination() {
    state.value.eliminationsCount++
  }

  function recordPass() {
    state.value.passedCount++
  }

  function endRound() {
    state.value.phase = 'complete'
    state.value.endedAt = new Date().toISOString()
  }

  function reset() {
    state.value = {
      number: 0,
      game: null,
      phase: 'setup',
      startedAt: null,
      endedAt: null,
      eliminationsCount: 0,
      passedCount: 0,
    }
  }

  return {
    state,

    startRound,
    setPhase,
    recordElimination,
    recordPass,
    endRound,
    reset,
  }
})
