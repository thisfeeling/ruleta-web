export interface GameStartedEvent {
  game_id: string
  game: string
  round: number
  players_alive: number
}

export interface PlayerEliminatedEvent {
  player_id: number
  player_number: number
  nickname: string
  eliminated_by?: string
  audio_url?: string
}

export interface ScreenChangedEvent {
  screen: string
  params?: Record<string, unknown>
}

export interface RoundStartedEvent {
  game: string
  round: number
}

export interface GameEndedEvent {
  winner_id?: number
  winner_number?: number
  final_scores?: Record<number, number>
}
