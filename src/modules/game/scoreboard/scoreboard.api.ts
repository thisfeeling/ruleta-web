import { apiService } from '@/modules/core/services/api.service'
import type { PlayerScore } from './scoreboard.types'
import { normalizeScore } from './scoreboard.logic'
import { useAuthStore } from '@/modules/core/stores/auth.store'
import { useScoreboardStore } from './scoreboard.store'

export interface SubmitParams {
  game: string
  rawData: unknown
  score?: number
}

/**
 * Submit score to backend. Also performs an optimistic local update to the scoreboard
 * so the UI feels responsive (the backend should broadcast `ScoreAdded` afterwards).
 */
export async function submitGameScore(params: SubmitParams) {
  const normalized = params.score ?? normalizeScore(params.game, params.rawData)

  // Optimistic local update
  try {
    const auth = useAuthStore()
    const scoreboard = useScoreboardStore()

    const player = auth.player
    if (player) {
      const optimistic: PlayerScore = {
        player_id: player.id,
        player_number: player.number ?? 0,
        nickname: player.nickname ?? 'Player',
        color: player.color ?? '#999',
        game: params.game,
        score: normalized,
        normalized_score: normalized,
        timestamp: new Date().toISOString(),
      }

      scoreboard.addScore(optimistic)
    }
  } catch (err) {
    // Non-fatal - optimistic update failed, continue to submit to backend
    console.debug('[Scoreboard API] optimistic update failed', err)
  }

  // Send to backend
  try {
    const payload = {
      game: params.game,
      score: normalized,
      raw: params.rawData,
    }

    await apiService.post('/api/scores/add', payload)
  } catch (err) {
    console.error('[Scoreboard API] submitGameScore failed', err)
    throw err
  }
}

export async function getTopPlayers(showId: number, limit = 10) {
  return apiService.get<{
    top: Array<{
      player_id: number
      player_number: number
      normalized_score: number
      nickname?: string
      color?: string
    }>
  }>(`/api/shows/${showId}/scoreboard/top?limit=${limit}`)
}

export async function getScoreboard(showId: number) {
  return apiService.get(`/api/shows/${showId}/scoreboard`)
}
