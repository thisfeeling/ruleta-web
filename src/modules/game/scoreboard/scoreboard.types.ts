export interface PlayerScore {
  player_id: number
  player_number: number
  nickname: string
  color: string
  game: string
  score: number
  normalized_score: number
  timestamp: string
}

export interface ScoreboardEntry {
  rank: number
  player_id: number
  player_number: number
  nickname: string
  color: string
  total_score: number
  scores_by_game: Map<string, number>
  is_eliminated: boolean
}
