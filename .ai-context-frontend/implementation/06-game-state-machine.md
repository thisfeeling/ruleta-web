# 06 - Game State Machine & Scene Management

**Status**: [ ] Not Started | [ ] In Progress | [ ] Completed | [ ] Tested

---

## 📋 Overview

Sistema central que orquesta el flujo del show completo: orden de juegos, transiciones, eliminaciones, y gestión de escenas.

---

## 🎯 Objectives

- [ ] Implementar state machine para flujo de juegos
- [ ] Crear game.store.ts (estado global del show)
- [ ] Crear round.store.ts (gestión de rondas)
- [ ] Implementar LobbyScene.vue
- [ ] Implementar TransitionScene.vue
- [ ] Implementar WinnerScene.vue
- [ ] Integrar WebSocket events del show

---

## 📁 Files to Create

```
src/modules/game/
├── engine/
│   ├── state-machine.ts
│   ├── eliminations.ts
│   └── loop.ts
├── stores/
│   ├── game.store.ts
│   └── round.store.ts
├── scenes/
│   ├── LobbyScene.vue
│   ├── TransitionScene.vue
│   └── WinnerScene.vue
└── net/
    ├── game.events.ts
    └── game.socket.ts
```

---

## 🔧 Implementation Details

### 1. State Machine (`engine/state-machine.ts`)

Define el flujo de juegos y transiciones:

```typescript
export type GameState =
  | 'lobby'
  | 'millionaire-1'
  | 'spell-1'
  | 'rope-1'
  | 'millionaire-2'
  | 'spell-2'
  | 'roulette'
  | 'winner'
  | 'word-search' // bonus
  | 'flappy' // bonus

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
```

**Key Features**:

- [ ] Define game flow sequence
- [ ] Handle transitions between games
- [ ] Support bonus games insertion
- [ ] Calculate next game based on current state
- [ ] Validate state transitions

---

### 2. Game Store (`stores/game.store.ts`)

Estado global del show completo:

```typescript
export interface GameState {
  id: string
  code: string
  status: 'waiting' | 'active' | 'paused' | 'ended'
  currentGame: string | null
  currentRound: number
  maxRounds: number
  playersTotal: number
  playersAlive: number
  startedAt: string | null
  endedAt: string | null
}
```

**Key Actions**:

- [ ] `setGameState(state)` - Set full game state
- [ ] `startGame()` - Transition from lobby to first game
- [ ] `nextRound()` - Advance to next game in flow
- [ ] `endGame()` - Mark game as ended
- [ ] `pauseGame()` / `resumeGame()` - Control game flow
- [ ] `updatePlayerCounts(alive, total)` - Track eliminations

**WebSocket Integration**:

- Listen to `GameStarted`
- Listen to `GameStateChanged`
- Listen to `RoundStarted`
- Listen to `GameEnded`

---

### 3. Round Store (`stores/round.store.ts`)

Gestión de la ronda actual:

```typescript
export interface RoundState {
  number: number
  game: string
  phase: 'setup' | 'playing' | 'results' | 'complete'
  startedAt: string | null
  endedAt: string | null
  eliminationsCount: number
  passedCount: number
}
```

**Key Actions**:

- [ ] `startRound(game, number)` - Initialize round
- [ ] `setPhase(phase)` - Update round phase
- [ ] `recordElimination()` - Increment elimination count
- [ ] `recordPass()` - Increment pass count
- [ ] `endRound()` - Mark round as complete
- [ ] `reset()` - Clear round state

---

### 4. Lobby Scene (`scenes/LobbyScene.vue`)

Sala de espera antes de iniciar el show:

**Features**:

- [ ] Display game code
- [ ] Show player list (live updates)
- [ ] Show player count
- [ ] Start button (supervisor only)
- [ ] Join instructions
- [ ] Background music
- [ ] Chat integration

**Components Used**:

- `PlayerList`
- `ChatBox`
- `LanguageSwitcher`

---

### 5. Transition Scene (`scenes/TransitionScene.vue`)

Pantalla entre juegos:

**Features**:

- [ ] Show next game name
- [ ] Display remaining players
- [ ] Show countdown (e.g., 10 seconds)
- [ ] Play transition audio/narration
- [ ] Animated visuals
- [ ] Scoreboard preview

**Props**:

- `nextGame: string`
- `countdown: number`
- `playersAlive: number`

---

### 6. Winner Scene (`scenes/WinnerScene.vue`)

Celebración del ganador final:

**Features**:

- [ ] Display winner PlayerCard (large)
- [ ] Show confetti animation
- [ ] Play victory music
- [ ] Display final scoreboard
- [ ] Show game statistics
- [ ] "Play Again" button (supervisor)
- [ ] Victory narration audio

**Data**:

- `winner: Player`
- `finalScore: number`
- `totalRounds: number`
- `gameTimeMinutes: number`

---

### 7. Eliminations Logic (`engine/eliminations.ts`)

Cálculo de eliminaciones dinámicas:

```typescript
export function calculateEliminations(
  totalPlayers: number,
  round: number,
  gameType: string,
): number {
  // Example logic (customize per requirements)
  // Millionaire: Eliminate 50% in first round
  // Rope: Eliminate losing groups
  // Spell: Individual elimination
  // Roulette: Eliminate all but 1
}
```

**Key Functions**:

- [ ] `calculateEliminations(total, round, gameType)` - How many to eliminate
- [ ] `selectPlayersToEliminate(players, count, criteria)` - Who gets eliminated
- [ ] `isEliminationRound(game)` - Check if game eliminates
- [ ] `calculateGroupEliminations(groups)` - For rope game

---

### 8. Game Loop (`engine/loop.ts`)

Optional: Time-based game loop for animations/countdowns:

```typescript
export class GameLoop {
  private running = false
  private frameId: number | null = null

  start(callback: (deltaTime: number) => void) {
    // RAF loop
  }

  stop() {
    // Cancel RAF
  }
}
```

---

### 9. WebSocket Events (`net/game.events.ts`)

Definir tipos de eventos:

```typescript
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
  eliminated_by: string
  audio_url?: string
}

export interface ScreenChangedEvent {
  screen: GameScreen
  params?: Record<string, any>
}
```

---

### 10. WebSocket Listeners (`net/game.socket.ts`)

Composable para escuchar eventos globales:

```typescript
export function useGameWebSocket() {
  const gameStore = useGameStore()
  const roundStore = useRoundStore()
  const playersStore = usePlayersStore()
  const { channel } = useEcho()

  const gameChannel = channel('game.show')

  // Game Started
  gameChannel.listen('GameStarted', (event: GameStartedEvent) => {
    gameStore.startGame()
    roundStore.startRound(event.game, event.round)
  })

  // Screen Changed
  gameChannel.listen('ScreenChanged', (event: ScreenChangedEvent) => {
    sessionStore.setScreen(event.screen)
  })

  // Player Eliminated
  gameChannel.listen('PlayerEliminated', (event: PlayerEliminatedEvent) => {
    playersStore.eliminatePlayer(event.player_id)
    roundStore.recordElimination()

    // Play narration if available
    if (event.audio_url) {
      audioService.play({
        id: 'elimination-narration',
        url: event.audio_url,
        channel: 'voice',
      })
    }
  })

  // Round Started
  gameChannel.listen('RoundStarted', (event) => {
    roundStore.startRound(event.game, event.round)
  })

  // Game Ended
  gameChannel.listen('GameEnded', (event) => {
    gameStore.endGame()
    sessionStore.setScreen('winner')
  })
}
```

**Checklist**:

- [ ] Listen to all game flow events
- [ ] Update stores accordingly
- [ ] Play audio for narrations
- [ ] Handle screen transitions
- [ ] Test event sequence

---

## 🎮 Usage Example

### In GameView.vue

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useSessionStore } from '@/modules/core/stores/session.store'
import { useGameWebSocket } from '@/modules/game/net/game.socket'

// Initialize WebSocket listeners
useGameWebSocket()

const sessionStore = useSessionStore()

const currentScene = computed(() => {
  switch (sessionStore.currentScreen) {
    case 'lobby':
      return LobbyScene
    case 'transition':
      return TransitionScene
    case 'millionaire':
      return MillionaireScene
    case 'rope':
      return RopeScene
    case 'spell':
      return SpellScene
    case 'roulette':
      return RouletteScene
    case 'word-search':
      return WordSearchScene
    case 'flappy':
      return FlappyScene
    case 'winner':
      return WinnerScene
    default:
      return LobbyScene
  }
})
</script>

<template>
  <component :is="currentScene" />
</template>
```

---

## ✅ Acceptance Criteria

- [ ] State machine defines correct game flow
- [ ] Game store tracks show state correctly
- [ ] Round store manages round lifecycle
- [ ] Lobby scene shows players and allows start
- [ ] Transition scene shows countdown
- [ ] Winner scene celebrates with animations
- [ ] WebSocket events update stores
- [ ] Screen transitions work smoothly
- [ ] Eliminations calculated correctly
- [ ] Audio narrations play on events
- [ ] Supervisor can control game flow

---

## 🔗 Related Files

- `src/modules/game/engine/state-machine.ts`
- `src/modules/game/engine/eliminations.ts`
- `src/modules/game/stores/game.store.ts`
- `src/modules/game/stores/round.store.ts`
- `src/modules/game/scenes/LobbyScene.vue`
- `src/modules/game/scenes/TransitionScene.vue`
- `src/modules/game/scenes/WinnerScene.vue`
- `src/modules/game/net/game.socket.ts`
- `src/views/GameView.vue`

---

## 📚 References

- [State Machines in Vue](https://vuejs.org/guide/extras/reactivity-in-depth.html)
- [WebSocket Event Handling](https://laravel.com/docs/broadcasting)
- [Game Loop Pattern](https://gameprogrammingpatterns.com/game-loop.html)
