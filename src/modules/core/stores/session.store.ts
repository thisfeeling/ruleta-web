import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type GameScreen =
  | 'lobby'
  | 'transition'
  | 'millionaire'
  | 'rope'
  | 'spell'
  | 'roulette'
  | 'word-search'
  | 'flappy'
  | 'winner'

export type GamePhase = 'waiting' | 'playing' | 'results' | 'ended'

export interface GameSession {
  id: string
  code: string
  current_game: string | null
  current_screen: GameScreen
  phase: GamePhase
  round: number
  players_alive: number
  players_total: number
  started_at: string | null
  ended_at: string | null
}

export const useSessionStore = defineStore('session', () => {
  const session = ref<GameSession | null>(null)
  const currentScreen = ref<GameScreen>('lobby')
  const isConnected = ref(false)
  const connectionError = ref<string | null>(null)

  const isInLobby = computed(() => currentScreen.value === 'lobby')
  const isInGame = computed(() => {
    const gameScreens: GameScreen[] = [
      'millionaire',
      'rope',
      'spell',
      'roulette',
      'word-search',
      'flappy',
    ]
    return gameScreens.includes(currentScreen.value)
  })
  const isGameActive = computed(() => session.value?.phase === 'playing')
  const gameCode = computed(() => session.value?.code ?? '')
  const playersAlive = computed(() => session.value?.players_alive ?? 0)
  const playersTotal = computed(() => session.value?.players_total ?? 0)
  const currentRound = computed(() => session.value?.round ?? 0)

  function setSession(data: GameSession) {
    session.value = data
    currentScreen.value = data.current_screen
    console.log('[Session] Updated:', data)
  }

  function updateSession(updates: Partial<GameSession>) {
    if (session.value) {
      session.value = { ...session.value, ...updates }
    }
  }

  function setScreen(screen: GameScreen) {
    currentScreen.value = screen
    if (session.value) {
      session.value.current_screen = screen
    }
    console.log('[Session] Screen changed to:', screen)
  }

  function setConnected(connected: boolean) {
    isConnected.value = connected
    if (connected) connectionError.value = null
  }

  function setConnectionError(error: string) {
    connectionError.value = error
    isConnected.value = false
  }

  function updatePlayerCounts(alive: number, total: number) {
    if (session.value) {
      session.value.players_alive = alive
      session.value.players_total = total
    }
  }

  function incrementRound() {
    if (session.value) session.value.round++
  }

  function reset() {
    session.value = null
    currentScreen.value = 'lobby'
    isConnected.value = false
    connectionError.value = null
  }

  return {
    session,
    currentScreen,
    isConnected,
    connectionError,

    isInLobby,
    isInGame,
    isGameActive,
    gameCode,
    playersAlive,
    playersTotal,
    currentRound,

    setSession,
    updateSession,
    setScreen,
    setConnected,
    setConnectionError,
    updatePlayerCounts,
    incrementRound,
    reset,
  }
})
