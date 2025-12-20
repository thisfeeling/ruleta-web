# Unified Scoreboard System

> **Sistema centralizado** para agregar, normalizar y mostrar puntuaciones de todos los juegos (principales + bonus)  
> **Server-authoritative**: Backend calcula, frontend solo renderiza  
> **Real-time**: WebSocket updates instantáneos via Reverb

---

## Arquitectura General

```
┌─────────────────────────────────────────────────┐
│  JUEGOS (6 total)                               │
│  ├─ Millionaire                                 │
│  ├─ Spell                                       │
│  ├─ Rope                                        │
│  ├─ Roulette                                    │
│  ├─ Word Search (bonus)                         │
│  └─ Flappy Bird (bonus)                         │
└─────────────────────────────────────────────────┘
                    ↓
         (envían resultados via WebSocket)
                    ↓
┌─────────────────────────────────────────────────┐
│  BACKEND (Laravel)                              │
│  ├─ Validación                                  │
│  ├─ Cálculo scores                              │
│  ├─ Normalización                               │
│  ├─ Persistencia (DB)                           │
│  └─ Broadcast (Reverb)                          │
└─────────────────────────────────────────────────┘
                    ↓
         (event: ScoreboardUpdated)
                    ↓
┌─────────────────────────────────────────────────┐
│  FRONTEND (Vue 3)                               │
│  ├─ scoreboard.store.ts (Pinia)                │
│  ├─ Scoreboard.vue (UI)                         │
│  └─ scoreboard.socket.ts (Listeners)            │
└─────────────────────────────────────────────────┘
```

---

## Principios Fundamentales

### ✅ Reglas Obligatorias

1. **Backend calcula TODO**: Frontend nunca suma puntos directamente
2. **Un solo store**: `scoreboard.store.ts` es la única fuente de verdad
3. **Normalización**: Diferentes juegos usan diferentes métricas → misma escala
4. **Inmutabilidad**: Scores nunca se modifican, solo se agregan nuevos
5. **Auditable**: Cada score guarda metadata (timestamp, game, raw value)

### ❌ Anti-Patterns

- ❌ Calcular scores en componentes Vue
- ❌ Modificar scores existentes
- ❌ Confiar en valores del cliente sin validar
- ❌ Mezclar lógica UI con lógica de scoring

---

## Data Model (Backend)

### Database Schema

```sql
-- Tabla principal de scores
CREATE TABLE player_scores (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    player_id BIGINT NOT NULL,
    game_type ENUM('millionaire', 'spell', 'rope', 'roulette', 'word-search', 'flappy') NOT NULL,
    round_number INT DEFAULT 1, -- Para juegos que se repiten (millionaire, spell)
    score INT NOT NULL, -- Score normalizado (0-1000)
    raw_value JSON, -- Valor original (tiempo, respuestas correctas, etc.)
    metadata JSON, -- Contexto adicional
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_player_game (player_id, game_type),
    INDEX idx_created_at (created_at),

    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- Vista agregada de totales
CREATE VIEW player_total_scores AS
SELECT
    player_id,
    SUM(score) as total_score,
    COUNT(*) as games_played,
    MAX(created_at) as last_update
FROM player_scores
GROUP BY player_id;
```

### Enum de Game Types

```php
// app/Domain/Scoreboard/GameType.php

enum GameType: string
{
    case MILLIONAIRE = 'millionaire';
    case SPELL = 'spell';
    case ROPE = 'rope';
    case ROULETTE = 'roulette';
    case WORD_SEARCH = 'word-search';
    case FLAPPY = 'flappy';

    public function isBonus(): bool
    {
        return in_array($this, [self::WORD_SEARCH, self::FLAPPY]);
    }

    public function maxScore(): int
    {
        return match($this) {
            self::MILLIONAIRE => 1000,
            self::SPELL => 800,
            self::ROPE => 600,
            self::ROULETTE => 2000, // Final game, más peso
            self::WORD_SEARCH => 500,
            self::FLAPPY => 500,
        };
    }
}
```

---

## Scoring Logic (Backend)

### Service Principal

```php
// app/Domain/Scoreboard/ScoreboardService.php

class ScoreboardService
{
    public function addGameScore(
        Player $player,
        GameType $gameType,
        array $rawValue,
        int $roundNumber = 1
    ): PlayerScore {
        // 1. Calcular score normalizado según tipo de juego
        $score = $this->calculateScore($gameType, $rawValue);

        // 2. Crear registro
        $playerScore = PlayerScore::create([
            'player_id' => $player->id,
            'game_type' => $gameType->value,
            'round_number' => $roundNumber,
            'score' => $score,
            'raw_value' => $rawValue,
            'metadata' => [
                'timestamp' => now()->toIso8601String(),
                'session_id' => session()->getId(),
            ],
        ]);

        // 3. Broadcast actualización
        event(new ScoreAdded($player, $gameType, $score));

        // 4. Broadcast ranking actualizado
        $this->broadcastRankings();

        return $playerScore;
    }

    private function calculateScore(GameType $gameType, array $rawValue): int
    {
        return match($gameType) {
            GameType::MILLIONAIRE => $this->scoreMillionaire($rawValue),
            GameType::SPELL => $this->scoreSpell($rawValue),
            GameType::ROPE => $this->scoreRope($rawValue),
            GameType::ROULETTE => $this->scoreRoulette($rawValue),
            GameType::WORD_SEARCH => $this->scoreWordSearch($rawValue),
            GameType::FLAPPY => $this->scoreFlappy($rawValue),
        };
    }

    // ===== Scoring por Juego =====

    private function scoreMillionaire(array $raw): int
    {
        // Puntos por respuesta correcta
        $correctAnswers = $raw['correct_answers'] ?? 0;
        $totalQuestions = $raw['total_questions'] ?? 10;

        $percentage = ($correctAnswers / $totalQuestions);

        return (int) floor($percentage * GameType::MILLIONAIRE->maxScore());
    }

    private function scoreSpell(array $raw): int
    {
        // Sobrevivir = score completo
        // Spelling correcto bonus
        $survived = $raw['survived'] ?? false;
        $correctSpelling = $raw['correct_spelling'] ?? false;

        $baseScore = $survived ? 600 : 0;
        $bonusScore = $correctSpelling ? 200 : 0;

        return $baseScore + $bonusScore;
    }

    private function scoreRope(array $raw): int
    {
        // Ganar grupo = score completo
        $groupWon = $raw['group_won'] ?? false;

        // Contribución individual (opcional)
        $contribution = $raw['contribution'] ?? 0.5; // 0-1

        $baseScore = $groupWon ? GameType::ROPE->maxScore() : 0;

        // Bonus por contribución
        $contributionBonus = (int) floor($contribution * 100);

        return $baseScore + $contributionBonus;
    }

    private function scoreRoulette(array $raw): int
    {
        // FINAL: Winner takes all
        $isWinner = $raw['is_winner'] ?? false;
        $finalPosition = $raw['position'] ?? 50;

        if ($isWinner) {
            return GameType::ROULETTE->maxScore();
        }

        // Consolation score basado en posición final
        // Posición 2 = 50% del max, etc.
        $consolation = max(0, GameType::ROULETTE->maxScore() - ($finalPosition * 100));

        return $consolation;
    }

    private function scoreWordSearch(array $raw): int
    {
        // Menos tiempo = más puntos
        $timeMs = $raw['time'] ?? PHP_INT_MAX;
        $maxTime = 300000; // 5 minutos

        if ($timeMs >= $maxTime) {
            return 0; // Timeout
        }

        // Escala inversa: completar rápido = más puntos
        $percentage = 1 - ($timeMs / $maxTime);

        return (int) floor($percentage * GameType::WORD_SEARCH->maxScore());
    }

    private function scoreFlappy(array $raw): int
    {
        // Más tiempo = más puntos (lineal)
        $survivalMs = $raw['survival_time'] ?? 0;

        // 1 punto cada 100ms
        $baseScore = floor($survivalMs / 100);

        // Cap al máximo
        return min($baseScore, GameType::FLAPPY->maxScore());
    }

    // ===== Rankings =====

    public function getRankings(int $limit = 50): Collection
    {
        return DB::table('player_total_scores')
            ->join('players', 'players.id', '=', 'player_total_scores.player_id')
            ->where('players.status', 'alive')
            ->orderByDesc('total_score')
            ->limit($limit)
            ->get([
                'players.id',
                'players.nickname',
                'players.color',
                'players.number',
                'player_total_scores.total_score',
                'player_total_scores.games_played',
            ])
            ->map(fn($row, $index) => [
                'rank' => $index + 1,
                'player_id' => $row->id,
                'nickname' => $row->nickname,
                'color' => $row->color,
                'number' => $row->number,
                'total_score' => $row->total_score,
                'games_played' => $row->games_played,
            ]);
    }

    public function getPlayerBreakdown(Player $player): array
    {
        $scores = PlayerScore::where('player_id', $player->id)
            ->orderBy('created_at')
            ->get();

        return [
            'player_id' => $player->id,
            'nickname' => $player->nickname,
            'total_score' => $scores->sum('score'),
            'breakdown' => $scores->map(fn($score) => [
                'game' => $score->game_type,
                'round' => $score->round_number,
                'score' => $score->score,
                'raw_value' => $score->raw_value,
                'timestamp' => $score->created_at,
            ]),
        ];
    }

    private function broadcastRankings(): void
    {
        $rankings = $this->getRankings();

        event(new ScoreboardUpdated($rankings));
    }
}
```

---

## Frontend Integration

### Store (scoreboard.store.ts)

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface PlayerScore {
  rank: number
  playerId: number
  nickname: string
  color: string
  number: number
  totalScore: number
  gamesPlayed: number
}

export interface ScoreBreakdown {
  game: string
  round: number
  score: number
  rawValue: any
  timestamp: string
}

export const useScoreboardStore = defineStore('scoreboard', () => {
  // State
  const rankings = ref<PlayerScore[]>([])
  const breakdown = ref<Record<number, ScoreBreakdown[]>>({})
  const lastUpdate = ref<Date | null>(null)

  // Computed
  const topPlayers = computed(() => rankings.value.slice(0, 10))

  const getPlayerRank = computed(() => {
    return (playerId: number): number | null => {
      const player = rankings.value.find((p) => p.playerId === playerId)
      return player?.rank ?? null
    }
  })

  const getPlayerScore = computed(() => {
    return (playerId: number): number => {
      const player = rankings.value.find((p) => p.playerId === playerId)
      return player?.totalScore ?? 0
    }
  })

  // Actions
  function updateRankings(newRankings: PlayerScore[]) {
    rankings.value = newRankings
    lastUpdate.value = new Date()
  }

  function updatePlayerBreakdown(playerId: number, scores: ScoreBreakdown[]) {
    breakdown.value[playerId] = scores
  }

  function addScore(playerId: number, game: string, score: number) {
    // Optimistic update (será sobrescrito por broadcast)
    const player = rankings.value.find((p) => p.playerId === playerId)
    if (player) {
      player.totalScore += score
      player.gamesPlayed += 1
    }

    // Re-sort
    rankings.value.sort((a, b) => b.totalScore - a.totalScore)

    // Re-rank
    rankings.value.forEach((player, index) => {
      player.rank = index + 1
    })
  }

  function reset() {
    rankings.value = []
    breakdown.value = {}
    lastUpdate.value = null
  }

  return {
    // State
    rankings,
    breakdown,
    lastUpdate,

    // Computed
    topPlayers,
    getPlayerRank,
    getPlayerScore,

    // Actions
    updateRankings,
    updatePlayerBreakdown,
    addScore,
    reset,
  }
})
```

### WebSocket Listeners (scoreboard.socket.ts)

```typescript
import { echoService } from '@/modules/core/services/echo.service'
import { useScoreboardStore } from './scoreboard.store'
import { audioService } from '@/modules/core/services/audio.service'

export function useScoreboardSocket() {
  const store = useScoreboardStore()
  const channel = echoService.private('scoreboard')

  // Score agregado (individual)
  channel.listen(
    'ScoreAdded',
    (event: {
      player: {
        id: number
        nickname: string
      }
      game_type: string
      score: number
    }) => {
      console.log(`Score added: ${event.player.nickname} +${event.score}`)

      // Optimistic update
      store.addScore(event.player.id, event.game_type, event.score)

      // SFX
      audioService.playSfx('ui/score-add')
    },
  )

  // Rankings actualizados (completo)
  channel.listen(
    'ScoreboardUpdated',
    (event: {
      rankings: Array<{
        rank: number
        player_id: number
        nickname: string
        color: string
        number: number
        total_score: number
        games_played: number
      }>
    }) => {
      store.updateRankings(
        event.rankings.map((r) => ({
          rank: r.rank,
          playerId: r.player_id,
          nickname: r.nickname,
          color: r.color,
          number: r.number,
          totalScore: r.total_score,
          gamesPlayed: r.games_played,
        })),
      )
    },
  )

  // Breakdown de jugador (detalle)
  channel.listen(
    'PlayerBreakdownUpdated',
    (event: {
      player_id: number
      breakdown: Array<{
        game: string
        round: number
        score: number
        raw_value: any
        timestamp: string
      }>
    }) => {
      store.updatePlayerBreakdown(event.player_id, event.breakdown)
    },
  )

  return { channel }
}
```

### UI Component (Scoreboard.vue)

```vue
<template>
  <div class="scoreboard">
    <div class="scoreboard-header">
      <h2 class="title">🏆 Ranking</h2>
      <div class="last-update">Actualizado: {{ formatTime(lastUpdate) }}</div>
    </div>

    <div class="rankings-list">
      <TransitionGroup name="rank" tag="div">
        <div
          v-for="player in rankings"
          :key="player.playerId"
          class="rank-item"
          :class="{
            'rank-1': player.rank === 1,
            'rank-2': player.rank === 2,
            'rank-3': player.rank === 3,
            'current-player': player.playerId === currentPlayerId,
          }"
        >
          <div class="rank-number">
            <span v-if="player.rank === 1">🥇</span>
            <span v-else-if="player.rank === 2">🥈</span>
            <span v-else-if="player.rank === 3">🥉</span>
            <span v-else>#{{ player.rank }}</span>
          </div>

          <div class="player-badge" :style="{ backgroundColor: player.color }">
            {{ player.number }}
          </div>

          <div class="player-info">
            <div class="nickname">{{ player.nickname }}</div>
            <div class="games-played">{{ player.gamesPlayed }} juegos</div>
          </div>

          <div class="score">
            {{ player.totalScore.toLocaleString() }}
          </div>

          <button
            v-if="showDetails"
            @click="openBreakdown(player.playerId)"
            class="btn btn-sm btn-ghost"
          >
            📊
          </button>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useScoreboardStore } from './scoreboard.store'
import { usePlayerStore } from '@/modules/player/player.store'

const props = defineProps<{
  limit?: number
  showDetails?: boolean
}>()

const scoreboardStore = useScoreboardStore()
const playerStore = usePlayerStore()

const rankings = computed(() => {
  const list = scoreboardStore.rankings
  return props.limit ? list.slice(0, props.limit) : list
})

const lastUpdate = computed(() => scoreboardStore.lastUpdate)
const currentPlayerId = computed(() => playerStore.currentPlayer?.id)

function formatTime(date: Date | null): string {
  if (!date) return 'Nunca'

  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 1000) return 'Ahora'
  if (diff < 60000) return `Hace ${Math.floor(diff / 1000)}s`
  if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)}m`

  return date.toLocaleTimeString()
}

function openBreakdown(playerId: number) {
  // Abrir modal con breakdown detallado
  console.log('Open breakdown for player:', playerId)
}
</script>

<style scoped>
.scoreboard {
  background: hsl(var(--b1));
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}

.scoreboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid hsl(var(--bc) / 0.1);
}

.title {
  font-size: 1.5rem;
  font-weight: bold;
  color: hsl(var(--bc));
}

.last-update {
  font-size: 0.875rem;
  color: hsl(var(--bc) / 0.6);
}

.rankings-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.rank-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: hsl(var(--b2));
  border-radius: 8px;
  transition: all 0.3s;
}

.rank-item:hover {
  background: hsl(var(--b3));
  transform: translateX(4px);
}

.rank-item.current-player {
  background: hsl(var(--p) / 0.1);
  border: 2px solid hsl(var(--p));
}

.rank-item.rank-1 {
  background: linear-gradient(135deg, #ffd700 0%, #ffa500 100%);
  color: #000;
  font-weight: bold;
}

.rank-item.rank-2 {
  background: linear-gradient(135deg, #c0c0c0 0%, #808080 100%);
  color: #000;
}

.rank-item.rank-3 {
  background: linear-gradient(135deg, #cd7f32 0%, #8b4513 100%);
  color: #fff;
}

.rank-number {
  min-width: 3rem;
  font-size: 1.25rem;
  font-weight: bold;
  text-align: center;
}

.player-badge {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-weight: bold;
  color: white;
  font-size: 1rem;
}

.player-info {
  flex: 1;
}

.nickname {
  font-weight: 600;
  font-size: 1rem;
}

.games-played {
  font-size: 0.75rem;
  opacity: 0.7;
}

.score {
  font-size: 1.25rem;
  font-weight: bold;
  font-family: 'Orbitron', monospace;
}

/* Animations */
.rank-enter-active,
.rank-leave-active {
  transition: all 0.5s ease;
}

.rank-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.rank-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.rank-move {
  transition: transform 0.5s ease;
}
</style>
```

### Compact Version (HUD)

Para mostrar en juegos activos:

```vue
<!-- ScoreboardCompact.vue -->
<template>
  <div class="scoreboard-compact">
    <div class="top-3">
      <div v-for="player in top3" :key="player.playerId" class="compact-item">
        <span class="rank">{{ getRankEmoji(player.rank) }}</span>
        <span class="nickname">{{ player.nickname }}</span>
        <span class="score">{{ formatScore(player.totalScore) }}</span>
      </div>
    </div>

    <div v-if="currentPlayerRank > 3" class="current-player">
      <span class="rank">#{{ currentPlayerRank }}</span>
      <span class="score">{{ formatScore(currentPlayerScore) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useScoreboardStore } from './scoreboard.store'
import { usePlayerStore } from '@/modules/player/player.store'

const scoreboardStore = useScoreboardStore()
const playerStore = usePlayerStore()

const top3 = computed(() => scoreboardStore.topPlayers.slice(0, 3))

const currentPlayerRank = computed(() => {
  const playerId = playerStore.currentPlayer?.id
  return playerId ? scoreboardStore.getPlayerRank(playerId) : null
})

const currentPlayerScore = computed(() => {
  const playerId = playerStore.currentPlayer?.id
  return playerId ? scoreboardStore.getPlayerScore(playerId) : 0
})

function getRankEmoji(rank: number): string {
  return rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'
}

function formatScore(score: number): string {
  if (score >= 1000) {
    return `${(score / 1000).toFixed(1)}k`
  }
  return score.toString()
}
</script>

<style scoped>
.scoreboard-compact {
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 0.75rem;
  color: white;
}

.top-3 {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.compact-item {
  display: flex;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.rank {
  min-width: 1.5rem;
}

.nickname {
  flex: 1;
  font-weight: 600;
}

.score {
  font-weight: bold;
  font-family: 'Orbitron', monospace;
}

.current-player {
  padding-top: 0.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  justify-content: space-between;
  font-weight: bold;
}
</style>
```

---

## Integration with Games

### Example: Millionaire Game

```typescript
// millionaire.logic.ts

import { useScoreboardStore } from '@/modules/game/scoreboard/scoreboard.store'

export function handleMillionaireComplete(correctAnswers: number, totalQuestions: number) {
  const scoreboardStore = useScoreboardStore()

  // Backend ya calculó y broadcast el score
  // Este es solo optimistic update local

  const estimatedScore = Math.floor((correctAnswers / totalQuestions) * 1000)

  console.log(`Estimated score: ${estimatedScore}`)

  // El store se actualizará via WebSocket
}
```

### Example: Word Search Bonus

```typescript
// word-search.logic.ts

export async function submitWordSearchResult(completionTime: number) {
  try {
    // Enviar al backend
    await apiService.post('/bonus/word-search/result', {
      completion_time: completionTime,
      timestamp: Date.now(),
    })

    // Backend calculará score y broadcast
    // Scoreboard.store se actualizará automáticamente
  } catch (error) {
    console.error('Failed to submit word search result:', error)
  }
}
```

---

## Analytics & Insights

### Supervisor Dashboard

```typescript
// supervisor.store.ts (fragment)

export function getGameAnalytics() {
  return {
    averageScoreByGame: {
      millionaire: 650,
      spell: 720,
      rope: 450,
      roulette: 1200,
      wordSearch: 380,
      flappy: 420,
    },

    highestScoringGame: 'roulette',
    lowestScoringGame: 'rope',

    playerDistribution: {
      top10percent: 5,
      middle50percent: 25,
      bottom40percent: 20,
    },
  }
}
```

---

## Performance Considerations

### Backend

- ✅ Índices en `player_id`, `game_type`, `created_at`
- ✅ Vista materializada para totales (MySQL 8+)
- ✅ Cache Redis para rankings (opcional)
- ✅ Batch inserts si muchos scores simultáneos

### Frontend

- ✅ Virtual scrolling si >100 jugadores
- ✅ Throttle WebSocket updates (max 1/segundo)
- ✅ Memoización de computed properties
- ✅ Lazy load breakdown modal

---

## Testing Strategy

### Backend Tests

```php
// tests/Feature/ScoreboardTest.php

public function test_millionaire_scoring()
{
    $player = Player::factory()->create();

    app(ScoreboardService::class)->addGameScore(
        $player,
        GameType::MILLIONAIRE,
        ['correct_answers' => 8, 'total_questions' => 10]
    );

    $score = PlayerScore::where('player_id', $player->id)->first();

    $this->assertEquals(800, $score->score);
}

public function test_ranking_calculation()
{
    $players = Player::factory()->count(10)->create();

    foreach ($players as $index => $player) {
        app(ScoreboardService::class)->addGameScore(
            $player,
            GameType::MILLIONAIRE,
            ['correct_answers' => $index, 'total_questions' => 10]
        );
    }

    $rankings = app(ScoreboardService::class)->getRankings();

    $this->assertEquals(10, $rankings->count());
    $this->assertEquals(1, $rankings->first()['rank']);
    $this->assertTrue($rankings->first()['total_score'] > $rankings->last()['total_score']);
}
```

### Frontend Tests

```typescript
// scoreboard.store.spec.ts

describe('ScoreboardStore', () => {
  it('updates rankings correctly', () => {
    const store = useScoreboardStore()

    const mockRankings = [
      { rank: 1, playerId: 1, nickname: 'Player1', totalScore: 1000 },
      { rank: 2, playerId: 2, nickname: 'Player2', totalScore: 800 },
    ]

    store.updateRankings(mockRankings)

    expect(store.rankings).toHaveLength(2)
    expect(store.topPlayers).toHaveLength(2)
  })

  it('calculates player rank correctly', () => {
    const store = useScoreboardStore()

    store.updateRankings([
      { rank: 1, playerId: 1, totalScore: 1000 },
      { rank: 2, playerId: 2, totalScore: 800 },
    ])

    expect(store.getPlayerRank(1)).toBe(1)
    expect(store.getPlayerRank(2)).toBe(2)
    expect(store.getPlayerRank(999)).toBeNull()
  })
})
```

---

## Summary

### Key Features

| Feature                  | Description                  | Status |
| ------------------------ | ---------------------------- | ------ |
| **Unified Store**        | Single source of truth       | ✅     |
| **Normalization**        | Different games → same scale | ✅     |
| **Real-time**            | WebSocket updates            | ✅     |
| **Server-authoritative** | Backend calculates all       | ✅     |
| **Auditable**            | Full history with metadata   | ✅     |
| **Breakdown**            | Per-game score details       | ✅     |
| **Analytics**            | Supervisor insights          | ✅     |

### Score Ranges

| Game                | Max Score | Weight            |
| ------------------- | --------- | ----------------- |
| Millionaire         | 1000      | High              |
| Spell               | 800       | Medium-High       |
| Rope                | 600       | Medium            |
| Roulette            | 2000      | Very High (final) |
| Word Search (bonus) | 500       | Medium            |
| Flappy (bonus)      | 500       | Medium            |

### Data Flow

```
Game Result → Backend Validation → Score Calculation →
Database → Broadcast (Reverb) → Frontend Store → UI Update
```

---

**Última actualización**: Diciembre 20, 2025  
**Versión**: 1.0.0
