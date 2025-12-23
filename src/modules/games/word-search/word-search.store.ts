import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Cell } from './word-search.types'

interface WordSearchState {
  grid: string[][]
  words: string[]
  foundWords: Set<string>
  selectedCells: Cell[]
  timeLeft: number
  score: number
}

const emptyGrid = Array.from({ length: 15 }, () => Array.from({ length: 15 }, () => ''))

const initialState: WordSearchState = {
  grid: emptyGrid,
  words: [],
  foundWords: new Set<string>(),
  selectedCells: [],
  timeLeft: 180,
  score: 0,
}

export const useWordSearchStore = defineStore('word-search', () => {
  const state = ref<WordSearchState>({ ...initialState })

  function setGrid(grid: string[][], words: string[]) {
    state.value.grid = grid
    state.value.words = words
    state.value.foundWords = new Set()
  }

  function markWordFound(word: string) {
    state.value.foundWords.add(word)
    state.value.score += Math.max(10, word.length * 10)
  }

  function tick() {
    if (state.value.timeLeft > 0) state.value.timeLeft -= 1
  }

  function reset() {
    state.value = { ...initialState }
  }

  return { state, setGrid, markWordFound, tick, reset }
})
