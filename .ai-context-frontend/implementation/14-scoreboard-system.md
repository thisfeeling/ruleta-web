# 14 - Scoreboard System

**Status**: [x] Completed

---

## 📋 Overview

Sistema de puntuación unificado que agrega puntos de todos los juegos (main + bonus) en un ranking global.

---

## 🎯 Objectives

- [x] Implementar scoreboard.store.ts
- [x] Implementar scoreboard.logic.ts (normalización)
- [x] Implementar scoreboard.socket.ts
- [x] Crear Scoreboard.vue (vista completa)
- [x] Crear ScoreboardCompact.vue (HUD compacto)
- [x] Integrar con todos los juegos

---

## 📁 Files to Create

```
src/modules/game/scoreboard/
├── scoreboard.store.ts
├── scoreboard.logic.ts
├── scoreboard.types.ts
├── scoreboard.socket.ts
├── ScoreboardComponent.vue
└── ScoreboardCompact.vue
```

---

## 🔧 Implementation

### 1. Types (`scoreboard.types.ts`)

```typescript
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
```

---

### 2. Store (`scoreboard.store.ts`)

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PlayerScore, ScoreboardEntry } from './scoreboard.types'
import { calculateTotalScore } from './scoreboard.logic'

export const useScoreboardStore = defineStore('scoreboard', () => {
  // State
  const scores = ref<PlayerScore[]>([])
  const entries = ref<Map<number, ScoreboardEntry>>(new Map())

  // Getters
  const sortedScoreboard = computed(() => {
    return Array.from(entries.value.values())
      .sort((a, b) => b.total_score - a.total_score)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }))
  })

  const topPlayers = computed(() => sortedScoreboard.value.slice(0, 10))

  // Actions

  function addScore(score: PlayerScore) {
    scores.value.push(score)
    updateEntry(score)
  }

  function addScores(scoreList: PlayerScore[]) {
    scoreList.forEach((score) => addScore(score))
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
        scores_by_game: new Map(),
        is_eliminated: false,
      }
      entries.value.set(score.player_id, entry)
    }

    // Update game score
    entry.scores_by_game.set(score.game, score.normalized_score)

    // Recalculate total
    entry.total_score = calculateTotalScore(entry.scores_by_game)
  }

  function getPlayerScore(playerId: number): ScoreboardEntry | undefined {
    return entries.value.get(playerId)
  }

  function getPlayerRank(playerId: number): number {
    return sortedScoreboard.value.findIndex((e) => e.player_id === playerId) + 1
  }

  function markEliminated(playerId: number) {
    const entry = entries.value.get(playerId)
    if (entry) {
      entry.is_eliminated = true
    }
  }

  function reset() {
    scores.value = []
    entries.value.clear()
  }

  return {
    // State
    scores,
    entries,

    // Getters
    sortedScoreboard,
    topPlayers,

    // Actions
    addScore,
    addScores,
    getPlayerScore,
    getPlayerRank,
    markEliminated,
    reset,
  }
})
```

**Checklist**:

- [x] Create store with scores array
- [x] Create entries map for aggregated data
- [x] Implement addScore action
- [x] Implement updateEntry to aggregate by player
- [x] Compute sortedScoreboard with ranks
- [x] Add helper methods (getPlayerScore, getPlayerRank)
- [x] Test with mock data

---

### 3. Logic (`scoreboard.logic.ts`)

```typescript
/**
 * Normalize game scores to 0-1000 range
 */
export const NORMALIZATION_RULES = {
  millionaire: (correctAnswers: number, totalQuestions: number) => {
    return (correctAnswers / totalQuestions) * 1000
  },

  rope: (clicks: number, groupClicks: number) => {
    // % contribution to group * 1000
    return (clicks / groupClicks) * 1000
  },

  spell: (correct: boolean, timeLeft: number, maxTime: number) => {
    if (!correct) return 0
    // Bonus for speed: 500 base + 500 time bonus
    return 500 + (timeLeft / maxTime) * 500
  },

  roulette: (won: boolean, round: number) => {
    // Winner gets 1000, losers get 0
    // Bonus for surviving more rounds
    return won ? 1000 + round * 100 : 0
  },

  wordSearch: (wordsFound: number, totalWords: number) => {
    return (wordsFound / totalWords) * 1000
  },

  flappy: (survivalTime: number) => {
    // Normalize by dividing by 100 (100 seconds = 1000 points)
    return Math.min(survivalTime / 100, 1000)
  },
}

/**
 * Calculate total score from all games
 */
export function calculateTotalScore(scoresByGame: Map<string, number>): number {
  let total = 0
  scoresByGame.forEach((score) => {
    total += score
  })
  return Math.round(total)
}

/**
 * Normalize raw score to 0-1000 range
 */
export function normalizeScore(game: string, rawData: any): number {
  const rule = NORMALIZATION_RULES[game as keyof typeof NORMALIZATION_RULES]

  if (!rule) {
    console.warn(`[Scoreboard] No normalization rule for game: ${game}`)
    return 0
  }

  // Apply normalization rule with raw data
  // Each game passes different params to its rule
  return Math.round(Math.max(0, Math.min(1000, rule(...rawData))))
}
```

**Checklist**:

- [x] Define normalization rules for each game
- [x] Implement calculateTotalScore
- [x] Implement normalizeScore helper
- [x] Test normalization with sample data
- [x] Verify all scores in 0-1000 range

---

### 4. WebSocket (`scoreboard.socket.ts`)

```typescript
import { useScoreboardStore } from './scoreboard.store'
import { useEcho } from '@/modules/core/composables/useEcho'

export function useScoreboardWebSocket() {
  const store = useScoreboardStore()
  const { channel } = useEcho()

  const gameChannel = channel('game.show')

  // Score added
  gameChannel.listen('ScoreAdded', (event: any) => {
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

    console.log('[Scoreboard] Score added:', event)
  })

  // Scoreboard updated (batch)
  gameChannel.listen('ScoreboardUpdated', (event: any) => {
    store.addScores(event.scores)
    console.log('[Scoreboard] Updated with', event.scores.length, 'scores')
  })

  // Player eliminated
  gameChannel.listen('PlayerEliminated', (event: any) => {
    store.markEliminated(event.player_id)
  })
}
```

**Checklist**:

- [x] Listen to ScoreAdded event
- [x] Listen to ScoreboardUpdated event (batch)
- [x] Listen to PlayerEliminated to mark in scoreboard
- [x] Test real-time updates

---

### 5. Scoreboard Component (Full) (`ScoreboardComponent.vue`)

```vue
<script setup lang="ts">
import { useScoreboardStore } from './scoreboard.store'
import { useI18n } from 'vue-i18n'

const store = useScoreboardStore()
const { t } = useI18n()
</script>

<template>
  <div class="scoreboard">
    <h2 class="scoreboard__title">
      {{ t('scoreboard.title') }}
    </h2>

    <div class="scoreboard__table">
      <table class="table table-zebra w-full">
        <thead>
          <tr>
            <th>{{ t('scoreboard.rank') }}</th>
            <th>{{ t('scoreboard.player') }}</th>
            <th>{{ t('scoreboard.score') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="entry in store.sortedScoreboard"
            :key="entry.player_id"
            :class="{ 'opacity-50': entry.is_eliminated }"
          >
            <td class="font-bold">
              <span v-if="entry.rank === 1">🥇</span>
              <span v-else-if="entry.rank === 2">🥈</span>
              <span v-else-if="entry.rank === 3">🥉</span>
              <span v-else>{{ entry.rank }}</span>
            </td>
            <td>
              <div class="flex items-center gap-2">
                <div
                  class="w-8 h-8 rounded flex items-center justify-center text-white font-bold"
                  :style="{ backgroundColor: entry.color }"
                >
                  {{ entry.player_number }}
                </div>
                <span>{{ entry.nickname }}</span>
                <span v-if="entry.is_eliminated" class="badge badge-ghost">
                  {{ t('player.eliminated') }}
                </span>
              </div>
            </td>
            <td class="font-mono font-bold text-lg">
              {{ entry.total_score.toLocaleString() }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty State -->
    <div v-if="store.sortedScoreboard.length === 0" class="scoreboard__empty">
      <p>{{ t('scoreboard.noScores') }}</p>
    </div>
  </div>
</template>

<style scoped>
.scoreboard {
  @apply w-full max-w-4xl mx-auto p-6;
  @apply bg-base-100 rounded-2xl shadow-xl;
}

.scoreboard__title {
  @apply text-3xl font-bold mb-6 text-center;
}

.scoreboard__table {
  @apply overflow-x-auto;
}

.scoreboard__empty {
  @apply text-center py-8 text-base-content/60;
}
</style>
```

**Checklist**:

- [x] Display full scoreboard table
- [x] Show ranks with medals (🥇🥈🥉)
- [x] Show player number, nickname, color
- [x] Show total score formatted
- [x] Highlight eliminated players
- [x] Show empty state

---

### 6. Scoreboard Compact (`ScoreboardCompact.vue`)

```vue
<script setup lang="ts">
import { useScoreboardStore } from './scoreboard.store'
import { useAuthStore } from '@/modules/core/stores/auth.store'
import { computed } from 'vue'

const scoreboardStore = useScoreboardStore()
const authStore = useAuthStore()

const playerEntry = computed(() => scoreboardStore.getPlayerScore(authStore.player?.id ?? 0))

const playerRank = computed(() => scoreboardStore.getPlayerRank(authStore.player?.id ?? 0))
</script>

<template>
  <div class="scoreboard-compact">
    <div class="scoreboard-compact__header">
      {{ $t('scoreboard.title') }}
    </div>

    <!-- Current Player Stats -->
    <div v-if="playerEntry" class="scoreboard-compact__player">
      <span class="scoreboard-compact__rank"> #{{ playerRank }} </span>
      <span class="scoreboard-compact__score">
        {{ playerEntry.total_score }}
      </span>
      <span class="scoreboard-compact__label">pts</span>
    </div>

    <!-- Top 3 -->
    <div class="scoreboard-compact__top3">
      <div
        v-for="entry in scoreboardStore.topPlayers.slice(0, 3)"
        :key="entry.player_id"
        class="scoreboard-compact__entry"
      >
        <span>{{ entry.rank }}.</span>
        <span class="scoreboard-compact__player-badge" :style="{ backgroundColor: entry.color }">
          {{ entry.player_number }}
        </span>
        <span class="scoreboard-compact__player-score">
          {{ entry.total_score }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scoreboard-compact {
  @apply fixed top-4 right-4 z-50;
  @apply bg-base-100 rounded-xl shadow-2xl p-4;
  @apply min-w-180px space-y-3;
}

.scoreboard-compact__header {
  @apply text-sm font-bold text-center border-b border-base-300 pb-2;
}

.scoreboard-compact__player {
  @apply flex items-center justify-between gap-2;
  @apply bg-primary/10 rounded-lg p-2;
}

.scoreboard-compact__rank {
  @apply text-lg font-bold text-primary;
}

.scoreboard-compact__score {
  @apply text-2xl font-mono font-bold;
}

.scoreboard-compact__label {
  @apply text-xs text-base-content/60;
}

.scoreboard-compact__top3 {
  @apply space-y-1 text-sm;
}

.scoreboard-compact__entry {
  @apply flex items-center gap-2;
}

.scoreboard-compact__player-badge {
  @apply w-6 h-6 rounded flex items-center justify-center;
  @apply text-white text-xs font-bold;
}

.scoreboard-compact__player-score {
  @apply ml-auto font-mono;
}
</style>
```

**Checklist**:

- [x] Show current player rank and score
- [x] Display top 3 players
- [x] Compact design for HUD
- [x] Position fixed in corner
- [x] Updates in real-time
---

## 🚀 Integration

### In GameLayout.vue

```vue
<script setup lang="ts">
import ScoreboardCompact from '@/modules/game/scoreboard/ScoreboardCompact.vue'
import PlayerHUB from '@/modules/player/PlayerHUB.vue'
import { useScoreboardWebSocket } from '@/modules/game/scoreboard/scoreboard.socket'

// Initialize WebSocket listeners
useScoreboardWebSocket()
</script>

<template>
  <div class="game-layout">
    <!-- Player HUD (bottom-left) -->
    <PlayerHUB />

    <!-- Scoreboard Compact (top-right) -->
    <ScoreboardCompact />

    <!-- Game Scene -->
    <slot />
  </div>
</template>
```

### In Game Stores

Each game should send scores to backend, which will broadcast `ScoreAdded` event:

```typescript
// Example: In millionaire.store.ts
async function submitScore() {
  const normalizedScore = calculateScore(
    store.correctAnswers,
    store.totalQuestions,
    store.difficulty,
  )

  await apiService.post('/api/scores/add', {
    game: 'millionaire',
    score: normalizedScore,
  })

  // Backend will broadcast ScoreAdded event
  // Scoreboard will update automatically
}
```

---

## ✅ Acceptance Criteria

- [x] Store aggregates scores from all games
- [x] Scores normalized to 0-1000 range
- [x] Total score calculated correctly
- [x] Scoreboard sorts by total score
- [x] Ranks calculated and displayed
- [x] WebSocket updates in real-time
- [x] Full scoreboard component displays all players
- [x] Compact scoreboard shows top 3 + current player
- [x] Eliminated players marked visually
- [x] Integration with all games works
- [x] No duplicate scores for same player/game
- [x] Performance good with 50 players

---

## 🔗 Related Files

- `src/modules/game/scoreboard/scoreboard.store.ts`
- `src/modules/game/scoreboard/scoreboard.logic.ts`
- `src/modules/game/scoreboard/scoreboard.socket.ts`
- `src/modules/game/scoreboard/ScoreboardComponent.vue`
- `src/modules/game/scoreboard/ScoreboardCompact.vue`
- `src/ui/layouts/GameLayout.vue`

---

## 📚 References

- [Pinia Stores](https://pinia.vuejs.org/)
- [DaisyUI Tables](https://daisyui.com/components/table/)
- [Vue Computed Properties](https://vuejs.org/guide/essentials/computed.html)
