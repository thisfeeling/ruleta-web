import { useScoreboardStore } from './scoreboard.store'
import type { PlayerScore } from './scoreboard.types'
import { useEcho } from '@/modules/core/composables/useEcho'

export function useScoreboardWebSocket() {
  const store = useScoreboardStore()
  const { channel } = useEcho()

  const gameChannel = channel('game.show')

  gameChannel?.listen('ScoreAdded', (...args: unknown[]) => {
    const event = args[0] as PlayerScore | undefined
    if (!event) return

    store.addScore({
      player_id: event.player_id,
      player_number: event.player_number,
      nickname: event.nickname,
      color: event.color,
      game: event.game,
      score: event.score,
      normalized_score: event.normalized_score,
      timestamp: event.timestamp,
    })

    console.debug('[Scoreboard] ScoreAdded', event)
  })

  gameChannel?.listen('ScoreboardUpdated', (...args: unknown[]) => {
    const event = args[0] as { scores?: PlayerScore[] } | undefined
    if (event && Array.isArray(event.scores)) {
      store.addScores(event.scores)

      console.debug('[Scoreboard] ScoreboardUpdated', event.scores.length)
    }
  })

  gameChannel?.listen('PlayerEliminated', (...args: unknown[]) => {
    const event = args[0] as { player_id?: number } | undefined
    if (event && event.player_id != null) store.markEliminated(event.player_id)
  })

  return () => {
    // return cleanup function in case consumer wants to stop listening
    try {
      const stop = (gameChannel as unknown as { stopListening?: (...args: unknown[]) => void })
        ?.stopListening
      if (stop) {
        stop('ScoreAdded')
        stop('ScoreboardUpdated')
        stop('PlayerEliminated')
      }
    } catch {
      // ignore
    }
  }
}
