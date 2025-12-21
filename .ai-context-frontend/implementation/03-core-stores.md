# 03 - Core Stores (Auth, UI, Session)

**Status**: [ ] Not Started | [ ] In Progress | [ ] Completed | [ ] Tested

---

## 📋 Overview

Implementación de stores Pinia fundamentales para autenticación, estado UI global, y gestión de sesión de juego.

---

## 🎯 Objectives

- [ ] Implementar Auth Store (login, logout, token management)
- [ ] Implementar UI Store (modals, alerts, loading states)
- [ ] Implementar Session Store (current game state, screen)
- [ ] Crear tipos TypeScript para cada store
- [ ] Integrar stores con servicios core

---

## 📁 Files to Create

```
src/modules/core/stores/
├── auth.store.ts
├── ui.store.ts
└── session.store.ts
```

---

## 🔧 Implementation

### 1. Auth Store (`auth.store.ts`)

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiService } from '@/modules/core/services/api.service'
import { storageService } from '@/modules/core/services/storage.service'

export interface Player {
  id: number
  nickname: string
  number: number
  color: string
  pin: string
  is_supervisor: boolean
  is_eliminated: boolean
  eliminated_at: string | null
  created_at: string
}

export interface PlayerSession {
  player: Player
  token: string
  session_id: string
}

export const useAuthStore = defineStore('auth', () => {
  // State
  const player = ref<Player | null>(null)
  const token = ref<string | null>(null)
  const sessionId = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const isAuthenticated = computed(() => !!token.value && !!player.value)
  const isSupervisor = computed(() => player.value?.is_supervisor ?? false)
  const isEliminated = computed(() => player.value?.is_eliminated ?? false)
  const playerNumber = computed(() => player.value?.number ?? null)
  const playerNickname = computed(() => player.value?.nickname ?? '')
  const playerColor = computed(() => player.value?.color ?? '#000000')

  // Actions

  /**
   * Join game as new player
   */
  async function join(nickname: string, color: string) {
    isLoading.value = true
    error.value = null

    try {
      const response = await apiService.post<PlayerSession>('/api/players/join', {
        nickname,
        color,
      })

      player.value = response.player
      token.value = response.token
      sessionId.value = response.session_id

      // Save to localStorage
      localStorage.setItem('auth_token', response.token)
      storageService.savePlayerSession(response)

      console.log('[Auth] Player joined:', response.player.nickname)
      return response
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to join game'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Reconnect existing player
   */
  async function reconnect(playerNumber: number, pin: string) {
    isLoading.value = true
    error.value = null

    try {
      const response = await apiService.post<PlayerSession>('/api/players/reconnect', {
        number: playerNumber,
        pin,
      })

      player.value = response.player
      token.value = response.token
      sessionId.value = response.session_id

      // Save to localStorage
      localStorage.setItem('auth_token', response.token)
      storageService.savePlayerSession(response)

      console.log('[Auth] Player reconnected:', response.player.nickname)
      return response
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to reconnect'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Restore session from localStorage
   */
  function restoreSession() {
    const saved = storageService.getPlayerSession()
    if (saved) {
      player.value = saved.player
      token.value = saved.token
      sessionId.value = saved.session_id
      localStorage.setItem('auth_token', saved.token)
      console.log('[Auth] Session restored')
      return true
    }
    return false
  }

  /**
   * Logout and clear session
   */
  async function logout() {
    try {
      if (token.value) {
        await apiService.post('/api/players/logout')
      }
    } catch (err) {
      console.error('[Auth] Logout error:', err)
    } finally {
      player.value = null
      token.value = null
      sessionId.value = null
      localStorage.removeItem('auth_token')
      storageService.clearPlayerSession()
      console.log('[Auth] Player logged out')
    }
  }

  /**
   * Update player data (from WebSocket events)
   */
  function updatePlayer(updates: Partial<Player>) {
    if (player.value) {
      player.value = { ...player.value, ...updates }
      // Update localStorage
      const session = storageService.getPlayerSession()
      if (session) {
        session.player = player.value
        storageService.savePlayerSession(session)
      }
    }
  }

  /**
   * Mark player as eliminated
   */
  function markEliminated() {
    if (player.value) {
      player.value.is_eliminated = true
      player.value.eliminated_at = new Date().toISOString()
      updatePlayer(player.value)
    }
  }

  return {
    // State
    player,
    token,
    sessionId,
    isLoading,
    error,

    // Getters
    isAuthenticated,
    isSupervisor,
    isEliminated,
    playerNumber,
    playerNickname,
    playerColor,

    // Actions
    join,
    reconnect,
    restoreSession,
    logout,
    updatePlayer,
    markEliminated,
  }
})
```

**Checklist**:

- [ ] Create Player interface
- [ ] Create PlayerSession interface
- [ ] Implement join action
- [ ] Implement reconnect action
- [ ] Implement restoreSession from localStorage
- [ ] Implement logout with cleanup
- [ ] Implement updatePlayer for WebSocket events
- [ ] Add computed properties for common checks
- [ ] Test join flow
- [ ] Test reconnect flow
- [ ] Test session restoration

---

### 2. UI Store (`ui.store.ts`)

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Modal {
  id: string
  component: string
  props?: Record<string, any>
  persistent?: boolean
}

export interface Alert {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
  action?: {
    label: string
    callback: () => void
  }
}

export const useUIStore = defineStore('ui', () => {
  // State
  const modals = ref<Modal[]>([])
  const alerts = ref<Alert[]>([])
  const isLoading = ref(false)
  const loadingMessage = ref<string>('')

  // Modal actions

  function openModal(modal: Omit<Modal, 'id'>) {
    const id = `modal-${Date.now()}`
    modals.value.push({ id, ...modal })
    return id
  }

  function closeModal(id: string) {
    const index = modals.value.findIndex((m) => m.id === id)
    if (index !== -1) {
      modals.value.splice(index, 1)
    }
  }

  function closeAllModals() {
    modals.value = []
  }

  // Alert actions

  function showAlert(alert: Omit<Alert, 'id'>) {
    const id = `alert-${Date.now()}`
    const newAlert: Alert = {
      id,
      ...alert,
      duration: alert.duration ?? 5000,
    }

    alerts.value.push(newAlert)

    // Auto-dismiss after duration
    if (newAlert.duration > 0) {
      setTimeout(() => {
        dismissAlert(id)
      }, newAlert.duration)
    }

    return id
  }

  function dismissAlert(id: string) {
    const index = alerts.value.findIndex((a) => a.id === id)
    if (index !== -1) {
      alerts.value.splice(index, 1)
    }
  }

  function clearAlerts() {
    alerts.value = []
  }

  // Loading actions

  function startLoading(message = 'Cargando...') {
    isLoading.value = true
    loadingMessage.value = message
  }

  function stopLoading() {
    isLoading.value = false
    loadingMessage.value = ''
  }

  // Shorthand alert methods

  function success(message: string, duration?: number) {
    return showAlert({ type: 'success', message, duration })
  }

  function error(message: string, duration?: number) {
    return showAlert({ type: 'error', message, duration })
  }

  function warning(message: string, duration?: number) {
    return showAlert({ type: 'warning', message, duration })
  }

  function info(message: string, duration?: number) {
    return showAlert({ type: 'info', message, duration })
  }

  return {
    // State
    modals,
    alerts,
    isLoading,
    loadingMessage,

    // Modal actions
    openModal,
    closeModal,
    closeAllModals,

    // Alert actions
    showAlert,
    dismissAlert,
    clearAlerts,
    success,
    error,
    warning,
    info,

    // Loading actions
    startLoading,
    stopLoading,
  }
})
```

**Checklist**:

- [ ] Create Modal interface
- [ ] Create Alert interface
- [ ] Implement modal management (open/close)
- [ ] Implement alert system with auto-dismiss
- [ ] Implement loading state management
- [ ] Add shorthand methods for alerts
- [ ] Test modal stack behavior
- [ ] Test alert auto-dismiss
- [ ] Test loading states

---

### 3. Session Store (`session.store.ts`)

```typescript
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
  // State
  const session = ref<GameSession | null>(null)
  const currentScreen = ref<GameScreen>('lobby')
  const isConnected = ref(false)
  const connectionError = ref<string | null>(null)

  // Getters
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

  // Actions

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
    if (connected) {
      connectionError.value = null
    }
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
    if (session.value) {
      session.value.round++
    }
  }

  function reset() {
    session.value = null
    currentScreen.value = 'lobby'
    isConnected.value = false
    connectionError.value = null
  }

  return {
    // State
    session,
    currentScreen,
    isConnected,
    connectionError,

    // Getters
    isInLobby,
    isInGame,
    isGameActive,
    gameCode,
    playersAlive,
    playersTotal,
    currentRound,

    // Actions
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
```

**Checklist**:

- [ ] Create GameScreen type
- [ ] Create GamePhase type
- [ ] Create GameSession interface
- [ ] Implement session management
- [ ] Implement screen transitions
- [ ] Implement connection status tracking
- [ ] Add computed properties for common checks
- [ ] Test session updates
- [ ] Test screen changes
- [ ] Test player count updates

---

## 🚀 Integration Example

### In a Vue Component

```vue
<script setup lang="ts">
import { useAuthStore } from '@/modules/core/stores/auth.store'
import { useUIStore } from '@/modules/core/stores/ui.store'
import { useSessionStore } from '@/modules/core/stores/session.store'

const authStore = useAuthStore()
const uiStore = useUIStore()
const sessionStore = useSessionStore()

async function handleJoin() {
  try {
    uiStore.startLoading('Uniéndose al juego...')
    await authStore.join('Jugador1', '#FF0000')
    uiStore.success('¡Bienvenido al juego!')
  } catch (error) {
    uiStore.error('No se pudo unir al juego')
  } finally {
    uiStore.stopLoading()
  }
}
</script>

<template>
  <div>
    <p v-if="authStore.isAuthenticated">
      Hola, {{ authStore.playerNickname }} (#{{ authStore.playerNumber }})
    </p>
    <p>Pantalla actual: {{ sessionStore.currentScreen }}</p>
    <p>Jugadores vivos: {{ sessionStore.playersAlive }}/{{ sessionStore.playersTotal }}</p>
  </div>
</template>
```

---

## 🔌 WebSocket Integration

### Listen to session updates

```typescript
// In a component or service
import { useSessionStore } from '@/modules/core/stores/session.store'
import { useEcho } from '@/modules/core/composables/useEcho'

const sessionStore = useSessionStore()
const { channel } = useEcho()

// Listen to game.show channel
const gameChannel = channel('game.show')

gameChannel.listen('ScreenChanged', (event: any) => {
  sessionStore.setScreen(event.screen)
})

gameChannel.listen('PlayerEliminated', (event: any) => {
  sessionStore.updatePlayerCounts(event.players_alive, event.players_total)
})

gameChannel.listen('GameStarted', (event: any) => {
  sessionStore.updateSession({
    current_game: event.game,
    phase: 'playing',
  })
})
```

---

## ✅ Acceptance Criteria

- [ ] Auth store handles join/reconnect/logout
- [ ] Auth store persists session to localStorage
- [ ] Auth store restores session on page reload
- [ ] UI store manages modals stack
- [ ] UI store shows/dismisses alerts with auto-timeout
- [ ] UI store tracks loading states
- [ ] Session store tracks current screen and game state
- [ ] Session store updates from WebSocket events
- [ ] All stores work together seamlessly
- [ ] TypeScript types are correct and enforced

---

## 🔗 Related Files

- `src/modules/core/stores/auth.store.ts`
- `src/modules/core/stores/ui.store.ts`
- `src/modules/core/stores/session.store.ts`
- `src/plugins/pinia.ts`
- `src/main.ts`

---

## 📚 References

- [Pinia Documentation](https://pinia.vuejs.org/)
- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
- [TypeScript with Pinia](https://pinia.vuejs.org/core-concepts/#setup-stores)
