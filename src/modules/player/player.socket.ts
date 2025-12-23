import { echoService } from '@/modules/core/services/echo.service'
import { usePlayersStore } from './player.store'
import { useAuthStore } from '@/modules/core/stores/auth.store'
import { audioService } from '@/modules/core/services/audio.service'

export function registerPlayerSocketListeners() {
  let channel
  try {
    channel = echoService.listenToChannel('game.show')
  } catch {
    console.warn('[PlayerSocket] Echo not initialized, skipping listeners')
    return
  }

  const playersStore = usePlayersStore()
  const authStore = useAuthStore()

  // Player joined
  channel.listen('PlayerJoined', (...args: unknown[]) => {
    const event = (args[0] ?? {}) as Record<string, unknown>
    const playerRaw = event.player as Record<string, unknown> | undefined
    if (playerRaw && typeof playerRaw.id === 'number') {
      // minimal validation then cast
      const player = playerRaw as unknown as import('@/modules/core/stores/auth.store').Player
      playersStore.addPlayer(player)
      console.log('[WS] Player joined:', player.nickname)
    }
  })

  // Player eliminated
  channel.listen('PlayerEliminated', (...args: unknown[]) => {
    const event = (args[0] ?? {}) as Record<string, unknown>
    const playerId = typeof event.player_id === 'number' ? (event.player_id as number) : null
    if (playerId !== null) {
      playersStore.eliminatePlayer(playerId)
      if (authStore.player?.id === playerId) authStore.markEliminated()
      console.log('[WS] Player eliminated:', playerId)
    }

    if (typeof event.audio_url === 'string') {
      audioService.play({ id: 'narration', url: event.audio_url, channel: 'voice' })
    }
  })

  // Player disconnected
  channel.listen('PlayerDisconnected', (...args: unknown[]) => {
    const event = (args[0] ?? {}) as Record<string, unknown>
    const playerId = typeof event.player_id === 'number' ? (event.player_id as number) : null
    if (playerId !== null) {
      playersStore.removePlayer(playerId)
      console.log('[WS] Player disconnected:', playerId)
    }
  })

  // Player reconnected
  channel.listen('PlayerReconnected', (...args: unknown[]) => {
    const event = (args[0] ?? {}) as Record<string, unknown>
    const playerRaw = event.player as Record<string, unknown> | undefined
    if (playerRaw && typeof playerRaw.id === 'number') {
      const player = playerRaw as unknown as import('@/modules/core/stores/auth.store').Player
      playersStore.addPlayer(player)
      console.log('[WS] Player reconnected:', player.nickname)
    }
  })

  // Initial players list
  channel.listen('PlayersList', (...args: unknown[]) => {
    const event = (args[0] ?? {}) as Record<string, unknown>
    const playersRaw = event.players as unknown as Array<Record<string, unknown>> | undefined
    const players = (playersRaw ??
      []) as unknown as import('@/modules/core/stores/auth.store').Player[]
    playersStore.addPlayers(players)
    console.log('[WS] Players list received:', players.length)
  })
}
