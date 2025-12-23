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

  function end(finalScore: number) {
    state.value.isPlaying = false
    state.value.gameOver = true
    state.value.score = finalScore
    state.value.highScore = Math.max(state.value.highScore, finalScore)
  }

  function tick(ms: number) {
    state.value.survivalTime += ms
  }

  function reset() {
    state.value = { ...initialState }
  }

  return { state, start, end, tick, reset }
})
