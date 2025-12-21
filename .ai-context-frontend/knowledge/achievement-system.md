# Sistema de Logros (Achievements)

> **Fundacional**: Sistema transversal que captura hitos de todos los juegos  
> **Integración**: Alert system + Scoreboard + Audit logs  
> **Prioridad**: Implementar PRIMERO para evitar refactors futuros

---

## 📋 Índice

1. [Arquitectura General](#arquitectura-general)
2. [Modelo de Datos](#modelo-de-datos)
3. [Catálogo de Logros](#catálogo-de-logros)
4. [Triggers y Condiciones](#triggers-y-condiciones)
5. [WebSocket Events](#websocket-events)
6. [Integración Frontend](#integración-frontend)
7. [UI Components](#ui-components)
8. [Backend Service](#backend-service)
9. [Implementación](#implementación)

---

## Arquitectura General

### Principio Core

**Servidor autoritativo**: Laravel valida TODAS las condiciones de logros. Frontend SOLO renderiza notificaciones.

```
Player Action
    ↓
Backend valida acción
    ↓
AchievementService::check($playerId, $event, $payload)
    ↓
Evalúa reglas → ¿Cumple condición?
    ↓ SÍ
PlayerAchievement creado en DB
    ↓
Reverb broadcast: AchievementUnlocked
    ↓
Frontend: achievement.store recibe evento
    ↓
showAlert() con variant='achievement'
    ↓
Audio: playEffect('achievement_unlocked')
```

### Flujo de Datos

```typescript
// Backend determina
{
  player_id: 37,
  achievement_key: 'win_roulette',
  unlocked_at: '2025-12-21T15:30:00Z',
  progress: { current: 1, target: 1 }
}

// Frontend renderiza
Alert({
  type: 'achievement',
  title: '¡Logro Desbloqueado!',
  message: 'Campeón de la Ruleta',
  icon: '🏆',
  persistent: true,
  actions: [{ label: 'Ver Logros', onClick: () => router.push('/achievements') }]
})
```

---

## Modelo de Datos

### Tabla: `achievements`

```sql
CREATE TABLE achievements (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  key VARCHAR(80) UNIQUE NOT NULL,         -- 'play_millionaire', 'win_roulette'
  name VARCHAR(120) NOT NULL,              -- 'Primer Paso'
  description TEXT NOT NULL,               -- 'Juega tu primer Millonario'
  category ENUM('play', 'pass', 'win', 'bonus', 'master') NOT NULL,
  game_type ENUM('millionaire', 'rope', 'spell', 'roulette', 'word_search', 'flappy', 'all') NULL,
  icon VARCHAR(255) NULL,                  -- URL o emoji '🎯'
  points INT DEFAULT 0,                    -- Puntos bonus al desbloquear
  is_hidden BOOLEAN DEFAULT FALSE,         -- Logros secretos
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabla: `player_achievements`

```sql
CREATE TABLE player_achievements (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  player_id BIGINT NOT NULL,
  achievement_id BIGINT NOT NULL,
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  progress JSON NULL,                      -- { "current": 3, "target": 10, "meta": {...} }
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
  UNIQUE KEY unique_player_achievement (player_id, achievement_id)
);
```

### TypeScript Interface

```typescript
// src/types/achievement.types.ts

export type AchievementCategory = 'play' | 'pass' | 'win' | 'bonus' | 'master'

export type GameType =
  | 'millionaire'
  | 'rope'
  | 'spell'
  | 'roulette'
  | 'word_search'
  | 'flappy'
  | 'all'

export interface Achievement {
  id: number
  key: string
  name: string
  description: string
  category: AchievementCategory
  game_type: GameType | null
  icon: string
  points: number
  is_hidden: boolean
  sort_order: number
  created_at: string
}

export interface PlayerAchievement {
  id: number
  player_id: number
  achievement_id: number
  achievement: Achievement
  unlocked_at: string
  progress: {
    current: number
    target: number
    percentage?: number
    meta?: Record<string, any>
  } | null
}

export interface AchievementProgress {
  achievement_key: string
  current: number
  target: number
  percentage: number
}
```

---

## Catálogo de Logros

### 🎯 Categoría: PLAY (Participación)

| Key                | Nombre       | Descripción                    | Condición                | Puntos |
| ------------------ | ------------ | ------------------------------ | ------------------------ | ------ |
| `first_game`       | Primer Paso  | Completa tu primer juego       | Terminar cualquier juego | 10     |
| `play_millionaire` | Estudiante   | Participa en el Millonario     | Terminar Millionaire     | 10     |
| `play_rope`        | Tirador      | Participa en La Cuerda         | Terminar Rope            | 10     |
| `play_spell`       | Voz Valiente | Participa en Deletréalo        | Terminar Spell           | 10     |
| `play_roulette`    | Apostador    | Participa en la Ruleta         | Terminar Roulette        | 10     |
| `play_10_games`    | Veterano     | Completa 10 juegos             | Count >= 10              | 50     |
| `play_all_main`    | Todoterreno  | Juega los 4 juegos principales | Play M + R + S + Ro      | 100    |

### ✅ Categoría: PASS (Sobrevivir)

| Key                   | Nombre               | Descripción                          | Condición         | Puntos |
| --------------------- | -------------------- | ------------------------------------ | ----------------- | ------ |
| `survive_millionaire` | Cerebrito            | Sobrevive el Millonario              | No eliminado en M | 20     |
| `survive_spell`       | Acero bajo Presión   | Sobrevive Deletréalo                 | No eliminado en S | 30     |
| `survive_rope`        | Fuerza de Equipo     | Tu equipo gana en La Cuerda          | Team wins Rope    | 25     |
| `survive_3_rounds`    | Imparable            | Sobrevive 3 juegos seguidos          | Streak 3          | 50     |
| `perfect_millionaire` | Genio                | 15/15 correctas en Millonario        | 100% accuracy     | 100    |
| `spell_no_mistake`    | Deletreador Perfecto | Deletrea sin error en primer intento | 0 errors          | 50     |

### 🏆 Categoría: WIN (Ganar)

| Key                | Nombre               | Descripción                     | Condición                  | Puntos |
| ------------------ | -------------------- | ------------------------------- | -------------------------- | ------ |
| `win_roulette`     | Campeón de la Ruleta | Gana la Ruleta final            | Winner Roulette            | 500    |
| `top_3_scoreboard` | Podio                | Termina en top 3 del scoreboard | Rank <= 3                  | 150    |
| `rope_mvp`         | MVP de La Cuerda     | Más clicks en equipo ganador    | Max clicks in winning team | 40     |
| `millionaire_fast` | Cerebro Veloz        | Responde 15 preguntas < 3 min   | Time < 180s                | 60     |

### 🎁 Categoría: BONUS (Juegos Opcionales)

| Key                     | Nombre              | Descripción             | Condición             | Puntos |
| ----------------------- | ------------------- | ----------------------- | --------------------- | ------ |
| `word_search_speedster` | Buscador Relámpago  | Completa sopa < 60s     | Time < 60s            | 40     |
| `word_search_win`       | Campeón de Palabras | Gana ¡A buscar!         | Rank 1 in Word Search | 50     |
| `flappy_survivor_30s`   | Volador             | Sobrevive 30s en Flappy | Time >= 30s           | 30     |
| `flappy_survivor_60s`   | Águila              | Sobrevive 60s en Flappy | Time >= 60s           | 80     |
| `flappy_win`            | Rey del Aire        | Récord de Flappy Bird   | Rank 1 in Flappy      | 60     |
| `play_both_bonus`       | Explorador          | Juega ambos bonus       | Play WS + Flappy      | 25     |

### 👑 Categoría: MASTER (Secretos/Especiales)

| Key                    | Nombre              | Descripción                         | Condición                | Puntos |
| ---------------------- | ------------------- | ----------------------------------- | ------------------------ | ------ |
| `millionaire_no_50_50` | Confianza Pura      | Millonario sin usar 50:50           | 0 jokers used            | 80     |
| `clutch_winner`        | De Último Momento   | Gana desde posición 10+             | Rank > 10 antes de final | 200    |
| `comeback_king`        | Resurrección        | Pasa de bottom 5 a top 3            | Delta rank > 10          | 150    |
| `first_blood`          | Pionero             | Primer jugador en desbloquear logro | First in server          | 100    |
| `no_mistakes`          | Perfección Absoluta | Sin errores en TODO el show         | 0 errors globally        | 500    |
| `speed_demon`          | Demonio Veloz       | Completa show en < 20 min           | Total time < 1200s       | 250    |
| `team_spirit`          | Espíritu de Equipo  | Proponer nombre ganador en Rope     | Vote winner              | 20     |

### 🔒 Hidden Achievements (is_hidden = TRUE)

| Key                    | Nombre              | Condición                               |
| ---------------------- | ------------------- | --------------------------------------- |
| `secret_reconnect`     | Regreso Épico       | Reconecta y gana                        |
| `secret_last_standing` | Único Superviviente | Último jugador eliminado antes de final |
| `secret_lucky_777`     | Suertudo            | Acumular exactamente 777 puntos         |

**Total: 35+ logros**

---

## Triggers y Condiciones

### Backend: `AchievementService.php`

```php
namespace App\Services;

use App\Models\Achievement;
use App\Models\PlayerAchievement;
use App\Events\AchievementUnlocked;
use Illuminate\Support\Facades\DB;

class AchievementService
{
    /**
     * Verifica y desbloquea logros basado en un evento
     */
    public function check(int $playerId, string $event, array $payload = []): void
    {
        match ($event) {
            'game.completed' => $this->onGameCompleted($playerId, $payload),
            'game.won' => $this->onGameWon($playerId, $payload),
            'game.survived' => $this->onGameSurvived($playerId, $payload),
            'round.finished' => $this->onRoundFinished($playerId, $payload),
            'spell.correct' => $this->onSpellCorrect($playerId, $payload),
            'millionaire.perfect' => $this->onMillionairePerfect($playerId, $payload),
            'rope.mvp' => $this->onRopeMVP($playerId, $payload),
            'flappy.crash' => $this->onFlappyCrash($playerId, $payload),
            'word_search.complete' => $this->onWordSearchComplete($playerId, $payload),
            default => null
        };
    }

    private function onGameCompleted(int $playerId, array $payload): void
    {
        $gameType = $payload['game_type'];

        // first_game
        $this->unlockIfFirst($playerId, 'first_game');

        // play_{game}
        $this->unlock($playerId, "play_{$gameType}");

        // play_10_games (con progreso)
        $this->incrementProgress($playerId, 'play_10_games', 1, 10);

        // play_all_main
        if ($this->hasPlayedGames($playerId, ['millionaire', 'rope', 'spell', 'roulette'])) {
            $this->unlock($playerId, 'play_all_main');
        }
    }

    private function onGameWon(int $playerId, array $payload): void
    {
        $gameType = $payload['game_type'];

        if ($gameType === 'roulette') {
            $this->unlock($playerId, 'win_roulette');
        }

        // Rank checks
        $rank = $payload['rank'] ?? null;
        if ($rank && $rank <= 3) {
            $this->unlock($playerId, 'top_3_scoreboard');
        }
    }

    private function onGameSurvived(int $playerId, array $payload): void
    {
        $gameType = $payload['game_type'];
        $this->unlock($playerId, "survive_{$gameType}");

        // survive_3_rounds (streak)
        $this->incrementStreak($playerId, 'survive_3_rounds', 3);
    }

    private function onMillionairePerfect(int $playerId, array $payload): void
    {
        $correct = $payload['correct_answers'];
        $total = $payload['total_questions'];
        $jokersUsed = $payload['jokers_used'];

        if ($correct === $total) {
            $this->unlock($playerId, 'perfect_millionaire');
        }

        if ($jokersUsed === 0) {
            $this->unlock($playerId, 'millionaire_no_50_50');
        }

        $time = $payload['time_ms'];
        if ($time < 180000) { // 3 min
            $this->unlock($playerId, 'millionaire_fast');
        }
    }

    private function onFlappyCrash(int $playerId, array $payload): void
    {
        $timeMs = $payload['time_ms'];
        $timeSec = $timeMs / 1000;

        if ($timeSec >= 30) {
            $this->unlock($playerId, 'flappy_survivor_30s');
        }

        if ($timeSec >= 60) {
            $this->unlock($playerId, 'flappy_survivor_60s');
        }
    }

    private function onWordSearchComplete(int $playerId, array $payload): void
    {
        $timeMs = $payload['time_ms'];
        $timeSec = $timeMs / 1000;

        if ($timeSec < 60) {
            $this->unlock($playerId, 'word_search_speedster');
        }
    }

    /**
     * Desbloquea logro si no existe
     */
    private function unlock(int $playerId, string $achievementKey): void
    {
        $achievement = Achievement::where('key', $achievementKey)->first();

        if (!$achievement) {
            return;
        }

        $exists = PlayerAchievement::where('player_id', $playerId)
            ->where('achievement_id', $achievement->id)
            ->exists();

        if ($exists) {
            return;
        }

        DB::transaction(function () use ($playerId, $achievement) {
            PlayerAchievement::create([
                'player_id' => $playerId,
                'achievement_id' => $achievement->id,
                'unlocked_at' => now(),
                'progress' => null
            ]);

            // Broadcast WS
            broadcast(new AchievementUnlocked($playerId, $achievement));
        });
    }

    /**
     * Incrementa progreso de logro multi-step
     */
    private function incrementProgress(int $playerId, string $achievementKey, int $increment, int $target): void
    {
        $achievement = Achievement::where('key', $achievementKey)->first();

        if (!$achievement) {
            return;
        }

        $playerAchievement = PlayerAchievement::firstOrCreate(
            [
                'player_id' => $playerId,
                'achievement_id' => $achievement->id
            ],
            [
                'unlocked_at' => null,
                'progress' => ['current' => 0, 'target' => $target]
            ]
        );

        if ($playerAchievement->unlocked_at) {
            return; // Ya desbloqueado
        }

        $current = $playerAchievement->progress['current'] + $increment;
        $playerAchievement->progress = ['current' => $current, 'target' => $target];

        if ($current >= $target) {
            $playerAchievement->unlocked_at = now();
            broadcast(new AchievementUnlocked($playerId, $achievement));
        }

        $playerAchievement->save();
    }

    private function hasPlayedGames(int $playerId, array $gameTypes): bool
    {
        // Check if player has PlayerGame records for all game types
        // Implementation depends on game tracking
        return true; // Placeholder
    }
}
```

---

## WebSocket Events

### Evento: `AchievementUnlocked`

**Canal**: `private-player.{playerId}`

```json
{
  "event": "AchievementUnlocked",
  "data": {
    "player_id": 37,
    "achievement": {
      "id": 5,
      "key": "win_roulette",
      "name": "Campeón de la Ruleta",
      "description": "Ganaste la Ruleta final y eres el campeón del show",
      "category": "win",
      "game_type": "roulette",
      "icon": "🏆",
      "points": 500
    },
    "unlocked_at": "2025-12-21T15:30:00Z",
    "progress": {
      "current": 1,
      "target": 1,
      "percentage": 100
    }
  }
}
```

### Evento: `AchievementProgress`

**Canal**: `private-player.{playerId}`

```json
{
  "event": "AchievementProgress",
  "data": {
    "player_id": 37,
    "achievement_key": "play_10_games",
    "progress": {
      "current": 7,
      "target": 10,
      "percentage": 70
    }
  }
}
```

---

## Integración Frontend

### Pinia Store: `achievement.store.ts`

```typescript
// src/modules/game/achievements/achievement.store.ts

import { defineStore } from 'pinia'
import type { Achievement, PlayerAchievement, AchievementProgress } from '@/types/achievement.types'
import { apiService } from '@/modules/core/services/api.service'
import { useAlert } from '@/modules/core/composables/useAlert'
import { useAudio } from '@/modules/core/composables/useAudio'

interface AchievementState {
  achievements: Achievement[]
  playerAchievements: PlayerAchievement[]
  progress: Record<string, AchievementProgress>
  loading: boolean
  error: string | null
}

export const useAchievementStore = defineStore('achievement', {
  state: (): AchievementState => ({
    achievements: [],
    playerAchievements: [],
    progress: {},
    loading: false,
    error: null,
  }),

  getters: {
    unlockedCount: (state) => state.playerAchievements.length,

    totalPoints: (state) =>
      state.playerAchievements.reduce((sum, pa) => sum + pa.achievement.points, 0),

    byCategory: (state) => {
      return state.achievements.reduce(
        (acc, achievement) => {
          const category = achievement.category
          if (!acc[category]) acc[category] = []
          acc[category].push(achievement)
          return acc
        },
        {} as Record<string, Achievement[]>,
      )
    },

    isUnlocked: (state) => (achievementKey: string) => {
      return state.playerAchievements.some((pa) => pa.achievement.key === achievementKey)
    },

    getProgress: (state) => (achievementKey: string) => {
      return state.progress[achievementKey] || null
    },
  },

  actions: {
    async fetchAchievements() {
      this.loading = true
      try {
        const { data } = await apiService.get('/achievements')
        this.achievements = data.achievements
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    async fetchPlayerAchievements(playerId: number) {
      try {
        const { data } = await apiService.get(`/players/${playerId}/achievements`)
        this.playerAchievements = data.achievements
      } catch (error) {
        this.error = error.message
      }
    },

    handleAchievementUnlocked(payload: any) {
      const { player_id, achievement, unlocked_at, progress } = payload

      // Add to store
      this.playerAchievements.push({
        id: Date.now(), // Temporary ID
        player_id,
        achievement_id: achievement.id,
        achievement,
        unlocked_at,
        progress,
      })

      // Show alert
      const { showAlert } = useAlert()
      showAlert({
        type: 'achievement',
        title: '¡Logro Desbloqueado!',
        message: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        persistent: true,
        duration: 8000,
        actions: [
          {
            label: 'Ver Logros',
            class: 'btn-primary btn-sm',
            onClick: () => {
              // Navigate to achievements page
              return true
            },
          },
        ],
      })

      // Play audio
      const { playEffect } = useAudio()
      playEffect('achievement_unlocked')
    },

    handleAchievementProgress(payload: any) {
      const { achievement_key, progress } = payload
      this.progress[achievement_key] = progress

      // Optional: Show subtle progress notification
      if (progress.current % 5 === 0 || progress.percentage >= 90) {
        const { showAlert } = useAlert()
        showAlert({
          type: 'info',
          message: `Progreso: ${progress.current}/${progress.target}`,
          duration: 3000,
        })
      }
    },
  },
})
```

### WebSocket Listener: `achievement.socket.ts`

```typescript
// src/modules/game/achievements/achievement.socket.ts

import { echoService } from '@/modules/core/services/echo.service'
import { useAchievementStore } from './achievement.store'
import { useAuthStore } from '@/modules/core/stores/auth.store'

export function subscribeToAchievementEvents() {
  const achievementStore = useAchievementStore()
  const authStore = useAuthStore()

  if (!authStore.user) return

  const channel = echoService.private(`player.${authStore.user.id}`)

  channel.listen('AchievementUnlocked', (payload: any) => {
    console.log('[WS] AchievementUnlocked:', payload)
    achievementStore.handleAchievementUnlocked(payload)
  })

  channel.listen('AchievementProgress', (payload: any) => {
    console.log('[WS] AchievementProgress:', payload)
    achievementStore.handleAchievementProgress(payload)
  })
}

export function unsubscribeFromAchievementEvents() {
  const authStore = useAuthStore()
  if (!authStore.user) return

  echoService.leave(`player.${authStore.user.id}`)
}
```

---

## UI Components

### Extensión del Alert System

Actualizar `alert.types.ts`:

```typescript
// src/types/alert.types.ts

export type AlertType = 'info' | 'success' | 'warning' | 'error' | 'achievement'

export interface AlertOptions {
  type: AlertType
  message: string
  title?: string
  description?: string // NEW: For achievement description
  icon?: string // NEW: For emoji/icon
  duration?: number
  persistent?: boolean
  closable?: boolean
  actions?: AlertAction[]
  vertical?: boolean
  origin?: string
}
```

Actualizar `Alert.vue` para soportar variant `achievement`:

```vue
<!-- src/ui/components/alerts/Alert.vue -->

<template>
  <div
    :class="[
      'alert',
      `alert-${type}`,
      `alert-origin-${origin}`,
      { 'alert-vertical': vertical, 'alert-achievement': type === 'achievement' },
    ]"
    role="alert"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @focus="handleFocus"
    @blur="handleBlur"
  >
    <!-- Achievement Icon -->
    <div v-if="type === 'achievement' && icon" class="alert-achievement-icon">
      <span class="text-6xl">{{ icon }}</span>
    </div>

    <div class="alert-content">
      <div v-if="title" class="alert-title">{{ title }}</div>
      <div class="alert-message">{{ message }}</div>
      <div v-if="description" class="alert-description">{{ description }}</div>
    </div>

    <!-- Rest of component... -->
  </div>
</template>

<style scoped>
.alert-achievement {
  @apply bg-gradient-to-r from-yellow-500 to-amber-600 text-white;
  @apply border-2 border-yellow-300 shadow-2xl;
  animation:
    achievement-slide-in 0.5s ease-out,
    achievement-pulse 2s ease-in-out infinite;
}

.alert-achievement-icon {
  @apply flex items-center justify-center;
  animation: achievement-icon-bounce 0.8s ease-out;
}

@keyframes achievement-slide-in {
  from {
    transform: translateX(400px) scale(0.8);
    opacity: 0;
  }
  to {
    transform: translateX(0) scale(1);
    opacity: 1;
  }
}

@keyframes achievement-icon-bounce {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}

@keyframes achievement-pulse {
  0%,
  100% {
    box-shadow: 0 0 20px rgba(234, 179, 8, 0.5);
  }
  50% {
    box-shadow: 0 0 40px rgba(234, 179, 8, 0.8);
  }
}

.alert-description {
  @apply text-sm opacity-90 mt-1;
}
</style>
```

### Componente: `AchievementModal.vue`

```vue
<!-- src/modules/game/achievements/AchievementModal.vue -->

<template>
  <div v-if="isOpen" class="modal modal-open">
    <div class="modal-box max-w-4xl">
      <h2 class="text-2xl font-bold mb-4">🏆 Mis Logros</h2>

      <!-- Stats -->
      <div class="stats shadow mb-6">
        <div class="stat">
          <div class="stat-title">Desbloqueados</div>
          <div class="stat-value">{{ achievementStore.unlockedCount }}</div>
          <div class="stat-desc">de {{ achievementStore.achievements.length }}</div>
        </div>
        <div class="stat">
          <div class="stat-title">Puntos Totales</div>
          <div class="stat-value text-primary">{{ achievementStore.totalPoints }}</div>
        </div>
      </div>

      <!-- Achievements by Category -->
      <div v-for="(category, name) in achievementStore.byCategory" :key="name" class="mb-6">
        <h3 class="text-xl font-semibold mb-3 capitalize">{{ name }}</h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="achievement in category"
            :key="achievement.id"
            :class="[
              'card bg-base-200',
              achievementStore.isUnlocked(achievement.key)
                ? 'border-2 border-success'
                : 'opacity-50',
            ]"
          >
            <div class="card-body p-4">
              <div class="flex items-start gap-3">
                <div class="text-3xl">{{ achievement.icon }}</div>
                <div class="flex-1">
                  <h4 class="font-bold">{{ achievement.name }}</h4>
                  <p class="text-sm opacity-70">{{ achievement.description }}</p>
                  <div class="badge badge-primary mt-2">{{ achievement.points }} pts</div>

                  <!-- Progress Bar -->
                  <div v-if="!achievementStore.isUnlocked(achievement.key)" class="mt-2">
                    <progress
                      v-if="achievementStore.getProgress(achievement.key)"
                      class="progress progress-primary"
                      :value="achievementStore.getProgress(achievement.key).current"
                      :max="achievementStore.getProgress(achievement.key).target"
                    ></progress>
                  </div>

                  <!-- Unlocked Badge -->
                  <div v-else class="badge badge-success mt-2">✓ Desbloqueado</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-action">
        <button class="btn" @click="close">Cerrar</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAchievementStore } from './achievement.store'

const achievementStore = useAchievementStore()
const isOpen = ref(false)

function open() {
  isOpen.value = true
  achievementStore.fetchAchievements()
}

function close() {
  isOpen.value = false
}

defineExpose({ open, close })
</script>
```

---

## Backend Service

### API Endpoints

```php
// routes/api.php

Route::middleware(['auth:sanctum'])->group(function () {
    // List all achievements (with player progress)
    Route::get('/achievements', [AchievementController::class, 'index']);

    // Get player's unlocked achievements
    Route::get('/players/{player}/achievements', [AchievementController::class, 'playerAchievements']);

    // Manual trigger (testing/supervisor)
    Route::post('/achievements/check', [AchievementController::class, 'check'])
        ->middleware('role:supervisor');
});
```

### Controller: `AchievementController.php`

```php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Achievement;
use App\Models\User;
use App\Services\AchievementService;
use Illuminate\Http\Request;

class AchievementController extends Controller
{
    public function __construct(
        private AchievementService $achievementService
    ) {}

    public function index(Request $request)
    {
        $achievements = Achievement::orderBy('category')
            ->orderBy('sort_order')
            ->get();

        // Attach player progress if authenticated
        if ($user = $request->user()) {
            $achievements->each(function ($achievement) use ($user) {
                $playerAchievement = $user->achievements()
                    ->where('achievement_id', $achievement->id)
                    ->first();

                $achievement->unlocked = $playerAchievement ? true : false;
                $achievement->unlocked_at = $playerAchievement?->unlocked_at;
                $achievement->progress = $playerAchievement?->progress;
            });
        }

        return response()->json([
            'achievements' => $achievements
        ]);
    }

    public function playerAchievements(User $player)
    {
        $achievements = $player->achievements()
            ->with('achievement')
            ->orderBy('unlocked_at', 'desc')
            ->get();

        return response()->json([
            'achievements' => $achievements,
            'total_points' => $achievements->sum(fn($pa) => $pa->achievement->points)
        ]);
    }

    public function check(Request $request)
    {
        $validated = $request->validate([
            'player_id' => 'required|exists:users,id',
            'event' => 'required|string',
            'payload' => 'array'
        ]);

        $this->achievementService->check(
            $validated['player_id'],
            $validated['event'],
            $validated['payload'] ?? []
        );

        return response()->json(['success' => true]);
    }
}
```

---

## Implementación

### Fase 1: Base de Datos

1. Crear migración `create_achievements_table.php`
2. Crear migración `create_player_achievements_table.php`
3. Crear seeder `AchievementSeeder.php` con los 35+ logros

### Fase 2: Backend Logic

1. Implementar `AchievementService.php` con métodos trigger
2. Crear evento `AchievementUnlocked`
3. Integrar service en game controllers
4. Agregar endpoints REST

### Fase 3: Frontend Store

1. Crear `achievement.store.ts` (Pinia)
2. Crear `achievement.socket.ts` (Echo)
3. Integrar en `main.ts` para subscribe automático

### Fase 4: UI Components

1. Extender `Alert.vue` con variant `achievement`
2. Crear `AchievementModal.vue`
3. Agregar audio `achievement_unlocked.mp3`

### Fase 5: Testing

1. Unit tests para `AchievementService`
2. Integration tests para eventos WS
3. E2E tests para flujo completo

---

## Notas de Implementación

### Prioridad ALTA

- Implementar achievements ANTES de los juegos para evitar refactors
- Cada juego debe llamar `AchievementService::check()` al finalizar
- Logs de auditoría para desbloqueos (transparencia)

### Performance

- Caché de achievements en Redis (raramente cambian)
- Batch inserts para player_achievements
- Índices en (player_id, achievement_id)

### Seguridad

- Validación server-side SIEMPRE
- No confiar en eventos client-side
- Rate limiting en endpoint `/achievements/check`

### UX

- Sonido distintivo para logros
- Animación llamativa pero no intrusiva
- Opción de ver logros desde HUD (ícono 🏆)
- Mostrar progreso en tiempo real (barra de progreso)

---

## i18n Keys

```json
{
  "achievements": {
    "unlocked": "¡Logro Desbloqueado!",
    "progress": "Progreso: {current}/{target}",
    "view_all": "Ver Logros",
    "total_points": "Puntos Totales",
    "unlocked_count": "Desbloqueados",
    "categories": {
      "play": "Participación",
      "pass": "Sobrevivir",
      "win": "Ganar",
      "bonus": "Bonus",
      "master": "Maestría"
    }
  }
}
```

---

**Última actualización**: Diciembre 21, 2025  
**Autor**: Sistema de Logros - Fundacional  
**Prioridad**: CRÍTICA - Implementar PRIMERO
