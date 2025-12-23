export function calculateEliminations(
  totalPlayers: number,
  roundNumber: number,
  gameType: string,
): number {
  // Basic heuristic logic. Tunable per-game rules.
  const base = Math.max(0, totalPlayers)
  switch (gameType) {
    case 'millionaire-1':
      return Math.max(1, Math.floor(base * 0.5))
    case 'millionaire-2':
      return Math.max(1, Math.floor(base * 0.25))
    case 'rope-1':
      // eliminate roughly 25% on rope
      return Math.max(1, Math.ceil(base * 0.25))
    case 'spell-1':
    case 'spell-2':
      // individual elimination: few players
      return Math.max(1, Math.floor(base * 0.1))
    case 'roulette':
      // final: all but one
      return Math.max(0, base - 1)
    default:
      return 0
  }
}

export function selectPlayersToEliminate<T extends { id: number }>(
  players: T[],
  count: number,
): T[] {
  if (count <= 0) return []
  const shuffled = [...players]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = shuffled[i]!
    shuffled[i] = shuffled[j]!
    shuffled[j] = tmp
  }
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

export function isEliminationRound(game: string | null): boolean {
  if (!game) return false
  return /millionaire|rope|spell|roulette/.test(game)
}

export function calculateGroupEliminations(groups: number[], percentage = 0.5): number[] {
  // Given group sizes, calculate number eliminated per group
  return groups.map((g) => Math.max(0, Math.floor(g * percentage)))
}
