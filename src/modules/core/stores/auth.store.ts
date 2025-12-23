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

  // Helpers

  function extractErrorMessage(err: unknown, fallback = 'An error occurred'): string {
    if (typeof err === 'string' && err.length > 0) return err
    if (err instanceof Error && err.message) return err.message
    if (typeof err === 'object' && err !== null) {
      const e = err as Record<string, unknown>
      const response = e.response as Record<string, unknown> | undefined
      const data = response?.data as Record<string, unknown> | undefined
      const message = data?.message as string | undefined
      if (typeof message === 'string' && message.length > 0) return message
    }
    return fallback
  }

  // Actions

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
      try {
        localStorage.setItem('auth_token', response.token)
      } catch {}
      storageService.savePlayerSession(response as unknown)

      console.log('[Auth] Player joined:', response.player.nickname)
      return response
    } catch (err: unknown) {
      error.value = extractErrorMessage(err, 'Failed to join game')
      throw err
    } finally {
      isLoading.value = false
    }
  }

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

      try {
        localStorage.setItem('auth_token', response.token)
      } catch {}
      storageService.savePlayerSession(response as unknown)

      console.log('[Auth] Player reconnected:', response.player.nickname)
      return response
    } catch (err: unknown) {
      error.value = extractErrorMessage(err, 'Failed to reconnect')
      throw err
    } finally {
      isLoading.value = false
    }
  }

  function restoreSession() {
    const saved = storageService.getPlayerSession() as PlayerSession | null
    if (saved) {
      player.value = saved.player
      token.value = saved.token
      sessionId.value = saved.session_id
      try {
        localStorage.setItem('auth_token', saved.token)
      } catch {}
      console.log('[Auth] Session restored')
      return true
    }
    return false
  }

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
      try {
        localStorage.removeItem('auth_token')
      } catch {}
      storageService.clearPlayerSession()
      console.log('[Auth] Player logged out')
    }
  }

  function updatePlayer(updates: Partial<Player>) {
    if (player.value) {
      player.value = { ...player.value, ...updates }
      const session = storageService.getPlayerSession() as PlayerSession | null
      if (session) {
        session.player = player.value
        storageService.savePlayerSession(session as unknown)
      }
    }
  }

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
