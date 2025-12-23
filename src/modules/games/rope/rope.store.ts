import { defineStore } from 'pinia'
import { ref } from 'vue'

interface Player {
  id: number
  nickname?: string
}

interface Group {
  id: number
  players: Player[]
  totalClicks: number
  status: 'waiting' | 'playing' | 'passed' | 'eliminated'
}

interface RopeState {
  groups: Group[]
  currentGroup: Group | null
  tension: number
  maxTension: number
  isSnapped: boolean
  clicksPerPlayer: Record<number, number>
}

const initialState: RopeState = {
  groups: [],
  currentGroup: null,
  tension: 0,
  maxTension: 100,
  isSnapped: false,
  clicksPerPlayer: {},
}

export const useRopeStore = defineStore('rope', () => {
  const state = ref<RopeState>({ ...initialState })

  function setGroups(groups: Group[]) {
    state.value.groups = groups
  }

  function setTension(value: number) {
    state.value.tension = value
    if (value >= state.value.maxTension) state.value.isSnapped = true
  }

  function registerClick(playerId: number) {
    state.value.clicksPerPlayer[playerId] = (state.value.clicksPerPlayer[playerId] || 0) + 1
    setTension(state.value.tension + 1)
  }

  function reset() {
    state.value = { ...initialState }
  }

  return { state, setGroups, setTension, registerClick, reset }
})
