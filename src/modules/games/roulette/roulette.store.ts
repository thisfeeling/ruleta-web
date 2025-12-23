import { defineStore } from 'pinia'
import { ref } from 'vue'

interface Player {
  id: number
  nickname?: string
}

interface RouletteState {
  remainingPlayers: Player[]
  currentPlayer: Player | null
  isSpinning: boolean
  spinResult: 'win' | 'lose' | null
  spinAngle: number
}

const initialState: RouletteState = {
  remainingPlayers: [],
  currentPlayer: null,
  isSpinning: false,
  spinResult: null,
  spinAngle: 0,
}

export const useRouletteStore = defineStore('roulette', () => {
  const state = ref<RouletteState>({ ...initialState })

  function setPlayers(players: Player[]) {
    state.value.remainingPlayers = players
  }

  function startSpin(player: Player) {
    state.value.currentPlayer = player
    state.value.isSpinning = true
    state.value.spinResult = null
  }

  function setSpinResult(result: 'win' | 'lose', angle = 0) {
    state.value.isSpinning = false
    state.value.spinResult = result
    state.value.spinAngle = angle
    if (result === 'lose' && state.value.currentPlayer) {
      state.value.remainingPlayers = state.value.remainingPlayers.filter(
        (p) => p.id !== state.value.currentPlayer!.id,
      )
    }
  }

  function reset() {
    state.value = { ...initialState }
  }

  return { state, setPlayers, startSpin, setSpinResult, reset }
})
