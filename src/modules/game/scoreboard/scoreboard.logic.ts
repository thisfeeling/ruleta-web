/**
 * Scoreboard normalization & helpers
 */

export const NORMALIZATION_RULES = {
  millionaire: (correctAnswers: number, totalQuestions: number) => {
    if (totalQuestions === 0) return 0
    return (correctAnswers / totalQuestions) * 1000
  },

  rope: (clicks: number, groupClicks: number) => {
    if (groupClicks === 0) return 0
    return (clicks / groupClicks) * 1000
  },

  spell: (correct: boolean, timeLeft: number, maxTime: number) => {
    if (!correct) return 0
    return 500 + (timeLeft / maxTime) * 500
  },

  roulette: (won: boolean, round: number) => {
    return won ? 1000 + round * 100 : 0
  },

  wordSearch: (wordsFound: number, totalWords: number) => {
    if (totalWords === 0) return 0
    return (wordsFound / totalWords) * 1000
  },

  flappy: (survivalTime: number) => {
    // 100 seconds -> 1000 points
    return Math.min((survivalTime / 100) * 1000, 1000)
  },
}

export function calculateTotalScore(scoresByGame: Map<string, number>): number {
  let total = 0
  scoresByGame.forEach((score) => {
    total += score
  })
  return Math.round(total)
}

type NormalizationRule = (...args: unknown[]) => number
const RULES = NORMALIZATION_RULES as Record<string, NormalizationRule>

export function normalizeScore(game: string, rawData: unknown): number {
  // The rules expect params to be passed as an array-like of arguments
  const rule = RULES[game]

  if (typeof rule !== 'function') {
    console.warn(`[Scoreboard] No normalization rule for game: ${game}`)
    return 0
  }

  try {
    // If rawData is not array, wrap it
    const args = Array.isArray(rawData) ? rawData : [rawData]
    const value = rule(...(args as unknown[]))
    const clamped = Math.max(0, Math.min(1000, Number(value) || 0))
    return Math.round(clamped)
  } catch (err: unknown) {
    console.warn('[Scoreboard] Error normalizing score', err)
    return 0
  }
}
