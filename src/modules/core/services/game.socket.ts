import { echoService } from '@/modules/core/services/echo.service'
import { useSessionStore, type GameScreen } from '@/modules/core/stores/session.store'
import { useAuthStore } from '@/modules/core/stores/auth.store'
import { audioService } from '@/modules/core/services/audio.service'

export function registerGameSocketListeners() {
  let channel
  try {
    channel = echoService.listenToChannel('game.show')
  } catch {
    console.warn('[GameSocket] Echo not initialized, skipping listeners')
    return
  }

  // Game Started
  channel.listen('GameStarted', (...args: unknown[]) => {
    const event = (args[0] ?? {}) as Record<string, unknown>
    const sessionStore = useSessionStore()
    const game = event.game as string | undefined
    const round =
      typeof event.round === 'number' ? (event.round as number) : (sessionStore.session?.round ?? 1)
    const playersAlive =
      typeof event.players_alive === 'number'
        ? (event.players_alive as number)
        : sessionStore.session?.players_alive

    sessionStore.updateSession({
      current_game: game ?? sessionStore.session?.current_game ?? null,
      phase: 'playing',
      round,
      players_alive: playersAlive,
    })
  })

  // Screen Changed
  channel.listen('ScreenChanged', (...args: unknown[]) => {
    const event = (args[0] ?? {}) as Record<string, unknown>
    const sessionStore = useSessionStore()
    if (event?.screen && typeof event.screen === 'string')
      sessionStore.setScreen(event.screen as unknown as GameScreen)
    if (event?.params && typeof event.params === 'object') {
      sessionStore.updateSession(event.params as Record<string, unknown>)
    }
  })

  // Player Eliminated
  channel.listen('PlayerEliminated', (...args: unknown[]) => {
    const event = (args[0] ?? {}) as Record<string, unknown>
    const sessionStore = useSessionStore()
    const authStore = useAuthStore()

    const playersAlive =
      typeof event.players_alive === 'number' ? (event.players_alive as number) : null
    const playersTotal =
      typeof event.players_total === 'number' ? (event.players_total as number) : null

    if (playersAlive !== null && playersTotal !== null) {
      sessionStore.updatePlayerCounts(playersAlive, playersTotal)
    }

    const playerId = typeof event.player_id === 'number' ? (event.player_id as number) : null
    if (authStore.player && playerId === authStore.player.id) {
      authStore.markEliminated()
    }

    if (typeof event.audio_url === 'string') {
      audioService.play({ id: 'narration', url: event.audio_url, channel: 'voice' })
    }
  })

  // Optional: Scoreboard updates, RoundStarted, GameEnded etc. can be added here
}
