import { useEcho } from '@/modules/core/composables/useEcho'
import { useGameStore } from '@/modules/game/stores/game.store'
import { useRoundStore } from '@/modules/game/stores/round.store'
import { usePlayersStore } from '@/modules/player/player.store'
import { useSessionStore } from '@/modules/core/stores/session.store'
import { audioService } from '@/modules/core/services/audio.service'
import type {
  GameStartedEvent,
  PlayerEliminatedEvent,
  ScreenChangedEvent,
  RoundStartedEvent,
  GameEndedEvent,
} from './game.events'

export function useGameWebSocket() {
  const gameStore = useGameStore()
  const roundStore = useRoundStore()
  const playersStore = usePlayersStore()
  const sessionStore = useSessionStore()
  const { channel } = useEcho()

  const gameChannel = channel('game.show')

  // Game Started
  gameChannel?.listen('GameStarted', (...args: unknown[]) => {
    const event = args[0] as GameStartedEvent
    console.log('[GameSocket] GameStarted', event)
    gameStore.setGameState({
      id: event.game_id,
      code: '',
      status: 'active',
      currentGame: event.game,
      currentRound: event.round,
      maxRounds: 0,
      playersTotal: event.players_alive,
      playersAlive: event.players_alive,
      startedAt: new Date().toISOString(),
      endedAt: null,
    })
    roundStore.startRound(event.game, event.round)
  })

  // Screen Changed
  gameChannel?.listen('ScreenChanged', (...args: unknown[]) => {
    const event = args[0] as ScreenChangedEvent
    console.log('[GameSocket] ScreenChanged', event)
    sessionStore.setScreen(event.screen as any)
  })

  // Player Eliminated
  gameChannel?.listen('PlayerEliminated', (...args: unknown[]) => {
    const event = args[0] as PlayerEliminatedEvent
    console.log('[GameSocket] PlayerEliminated', event)
    playersStore.eliminatePlayer(event.player_id)
    roundStore.recordElimination()
    sessionStore.updatePlayerCounts(sessionStore.playersAlive - 1, sessionStore.playersTotal)

    if (event.audio_url) {
      audioService.play({
        id: `elimination-${event.player_id}`,
        url: event.audio_url,
        channel: 'voice',
      })
    }
  })

  // Round Started
  gameChannel?.listen('RoundStarted', (...args: unknown[]) => {
    const event = args[0] as RoundStartedEvent
    console.log('[GameSocket] RoundStarted', event)
    roundStore.startRound(event.game, event.round)
  })

  // Game Ended
  gameChannel?.listen('GameEnded', (...args: unknown[]) => {
    const event = args[0] as GameEndedEvent
    console.log('[GameSocket] GameEnded', event)
    gameStore.endGame()
    sessionStore.setScreen('winner')
  })

  return {
    gameChannel,
  }
}
