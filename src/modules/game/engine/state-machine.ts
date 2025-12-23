export type GameState =
  | 'lobby'
  | 'millionaire-1'
  | 'spell-1'
  | 'rope-1'
  | 'millionaire-2'
  | 'spell-2'
  | 'roulette'
  | 'winner'
  | 'word-search'
  | 'flappy'

export const GAME_FLOW: GameState[] = [
  'lobby',
  'millionaire-1',
  'spell-1',
  'rope-1',
  'millionaire-2',
  'spell-2',
  'roulette',
  'winner',
]

export function getFirstGame(): GameState {
  return GAME_FLOW[1]
}

export function getNextGame(current: GameState | null, allowBonus = false): GameState | null {
  if (!current) return GAME_FLOW[1] ?? null
  const idx = GAME_FLOW.indexOf(current)
  if (idx === -1) return null
  // next in flow
  const next = GAME_FLOW[idx + 1]
  if (!next && allowBonus) {
    // Optionally allow bonus insertion (not in flow) - return null by default
    return null
  }
  return (next as GameState) ?? null
}

export function isEliminationRound(game: string | null): boolean {
  if (!game) return false
  // Roulette and the millionaire rounds are elimination rounds; spell and rope also eliminate
  return /millionaire|rope|spell|roulette/.test(game)
}

export function validateTransition(from: GameState | null, to: GameState): boolean {
  if (from === null && to === 'lobby') return true
  const expected = getNextGame(from)
  if (!expected) return false
  return expected === to
}
