import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { GameState as GameStateType } from '@/modules/game/engine/state-machine'

export interface GameGlobalState {
  id: string
  code: string
  status: 'waiting' | 'active' | 'paused' | 'ended'
  currentGame: string | null
  currentRound: number
  maxRounds: number
  playersTotal: number
  playersAlive: number
  startedAt: string | null
  endedAt: string | null
}

export const useGameStore = defineStore('game', () => {
  const state = ref<GameGlobalState>({
    id: '',
    code: '',
    status: 'waiting',
    currentGame: null,
    currentRound: 0,
    maxRounds: 0,
    playersTotal: 0,
    playersAlive: 0,
    startedAt: null,
    endedAt: null,
  })

  function setGameState(payload: Partial<GameGlobalState>) {
    state.value = { ...state.value, ...payload }
  }

  function startGame() {
    state.value.status = 'active'
    state.value.startedAt = new Date().toISOString()
  }

  function nextRound(nextGame: string) {
    state.value.currentGame = nextGame
    state.value.currentRound++
  }

  function endGame() {
    state.value.status = 'ended'
    state.value.endedAt = new Date().toISOString()
  }

  function pauseGame() {
    state.value.status = 'paused'
  }

  function resumeGame() {
    state.value.status = 'active'
  }

  function updatePlayerCounts(alive: number, total: number) {
    state.value.playersAlive = alive
    state.value.playersTotal = total
  }

  return {
    state,

    setGameState,
    startGame,
    nextRound,
    endGame,
    pauseGame,
    resumeGame,
    updatePlayerCounts,
  }
})
