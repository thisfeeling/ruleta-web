import { defineStore } from 'pinia'
import { ref } from 'vue'

interface FlappyState {
  isPlaying: boolean
  score: number
  highScore: number
  survivalTime: number
  gameOver: boolean
}

const initialState: FlappyState = {
  isPlaying: false,
  score: 0,
  highScore: 0,
  survivalTime: 0,
  gameOver: false,
}

export const useFlappyStore = defineStore('flappy', () => {
  const state = ref<FlappyState>({ ...initialState })

  function start() {
    state.value.isPlaying = true
    state.value.gameOver = false
    state.value.survivalTime = 0
    state.value.score = 0
  }

  async function end(finalScore: number) {
    state.value.isPlaying = false
    state.value.gameOver = true
    state.value.score = finalScore
    state.value.highScore = Math.max(state.value.highScore, finalScore)

    // Submit score to backend (survivalTime is used by normalization)
    try {
      const { submitGameScore } = await import('@/modules/game/scoreboard/scoreboard.api')
      await submitGameScore({ game: 'flappy', rawData: state.value.survivalTime })
    } catch (e) {
      console.error('[FlappyStore] submitScore failed', e)
    }
  }

  function tick(ms: number) {
    state.value.survivalTime += ms
  }

  function reset() {
    state.value = { ...initialState }
  }

  return { state, start, end, tick, reset }
})
