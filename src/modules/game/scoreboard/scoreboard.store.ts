import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PlayerScore, ScoreboardEntry } from './scoreboard.types'
import { calculateTotalScore } from './scoreboard.logic'

export const useScoreboardStore = defineStore('scoreboard', () => {
  const scores = ref<PlayerScore[]>([])
  const entries = ref<Map<number, ScoreboardEntry>>(new Map())

  const sortedScoreboard = computed(() => {
    return Array.from(entries.value.values())
      .sort((a, b) => b.total_score - a.total_score)
      .map((entry, index) => ({ ...entry, rank: index + 1 }))
  })

  const topPlayers = computed(() => sortedScoreboard.value.slice(0, 10))

  // Fetch top players from API
  async function fetchTop(showId: number, limit = 10) {
    try {
      const resp = await import('./scoreboard.api').then((m) => m.getTopPlayers(showId, limit))
      if (resp && resp.top) {
        // map into PlayerScore and call addScore for each
        resp.top.forEach((p: any) => {
          addScore({
            player_id: p.player_id,
            player_number: p.player_number,
            nickname: p.nickname ?? `Player ${p.player_number}`,
            color: p.color ?? '#999',
            game: 'remote',
            score: p.normalized_score,
            normalized_score: p.normalized_score,
            timestamp: new Date().toISOString(),
          })
        })
      }
    } catch (err) {
      console.warn('[Scoreboard] fetchTop failed', err)
    }
  }

  // Keep track of last seen score per player+game to avoid duplicates
  const lastScoreMap = ref<Map<string, { normalized_score: number; timestamp: string }>>(new Map())

  function keyFor(score: PlayerScore) {
    return `${score.player_id}:${score.game}`
  }

  function updateEntry(score: PlayerScore) {
    let entry = entries.value.get(score.player_id)

    if (!entry) {
      entry = {
        rank: 0,
        player_id: score.player_id,
        player_number: score.player_number,
        nickname: score.nickname,
        color: score.color,
        total_score: 0,
        scores_by_game: new Map<string, number>(),
        is_eliminated: false,
      }
      entries.value.set(score.player_id, entry)
    }

    entry.scores_by_game.set(score.game, score.normalized_score)
    entry.total_score = calculateTotalScore(entry.scores_by_game)
  }

  function addScore(score: PlayerScore) {
    const key = keyFor(score)
    const last = lastScoreMap.value.get(key)

    // If we've already recorded this exact normalized score at the same timestamp, ignore
    if (
      last &&
      last.normalized_score === score.normalized_score &&
      last.timestamp === score.timestamp
    ) {
      return
    }

    // Store latest info
    lastScoreMap.value.set(key, {
      normalized_score: score.normalized_score,
      timestamp: score.timestamp,
    })

    scores.value.push(score)
    updateEntry(score)
  }

  function addScores(scoreList: PlayerScore[]) {
    scoreList.forEach((s) => addScore(s))
  }

  function getPlayerScore(playerId: number): ScoreboardEntry | undefined {
    return entries.value.get(playerId)
  }

  function getPlayerRank(playerId: number): number {
    return sortedScoreboard.value.findIndex((e) => e.player_id === playerId) + 1
  }

  function markEliminated(playerId: number) {
    const entry = entries.value.get(playerId)
    if (entry) entry.is_eliminated = true
  }

  function reset() {
    scores.value = []
    entries.value.clear()
    lastScoreMap.value.clear()
  }

  return {
    scores,
    entries,
    sortedScoreboard,
    topPlayers,
    addScore,
    addScores,
    getPlayerScore,
    getPlayerRank,
    markEliminated,
    reset,
  }
})
