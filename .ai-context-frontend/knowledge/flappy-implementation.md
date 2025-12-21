# No Lo Choques (Flappy Bird) - Implementación Completa

> **Tipo**: Juego estilo Flappy Bird  
> **Tecnología**: Phaser 3.80 + Vue 3 HUD overlay  
> **Bonus Game**: No elimina jugadores, solo genera puntos

---

## 🎯 Mecánica General

**Participantes**: Todos los jugadores vivos  
**Objetivo**: Sobrevivir el mayor tiempo posible sin chocar  
**Control**: Click/Tap para hacer volar  
**Física**: Gravedad + impulso al click  
**Ranking**: Por tiempo sobrevivido (mayor = mejor)  
**Puntos**: tiempo_ms / 100 (ej: 30s = 300 pts)

---

## 🎮 Arquitectura: Phaser + Vue

### Separación de Responsabilidades

```
┌─────────────────────────────────┐
│   Vue Component (FlappyScene)   │  ← HUD, UI, Routing
│   - Scoreboard compact          │
│   - Timer display               │
│   - Instructions button         │
└────────────┬────────────────────┘
             │
    ┌────────▼──────────┐
    │  Phaser 3 Game    │  ← Game loop, physics, rendering
    │  - Bird entity    │
    │  - Obstacles      │
    │  - Collision      │
    │  - Score tracking │
    └───────────────────┘
```

### Razón: Phaser completo con overlay Vue

- **Phaser**: Maneja física, colisiones, game loop
- **Vue**: HUD superpuesto (scoreboard, timer, botones)
- **Separación clara**: Rendering vs UI

---

## 📦 Setup Phaser

### Instalación

```bash
npm install phaser@3.80
```

### `flappy.game.ts` - Inicialización

```typescript
// src/modules/games/flappy/flappy.game.ts

import Phaser from 'phaser'
import { MainScene } from './flappy.scenes'

export class FlappyGame {
  private game: Phaser.Game | null = null

  constructor(private containerEl: HTMLElement) {}

  init(onCrash: (timeMs: number, obstaclesPassed: number) => void) {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: this.containerEl,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 1200 },
          debug: false,
        },
      },
      scene: MainScene,
      backgroundColor: '#87CEEB',
    }

    this.game = new Phaser.Game(config)

    // Pass callback to scene
    this.game.registry.set('onCrash', onCrash)
  }

  destroy() {
    this.game?.destroy(true)
    this.game = null
  }

  restart() {
    const scene = this.game?.scene.getScene('MainScene') as MainScene
    scene?.scene.restart()
  }
}
```

---

## 🐦 Phaser Scenes

### `flappy.scenes.ts` - Main Scene

```typescript
// src/modules/games/flappy/flappy.scenes.ts

import Phaser from 'phaser'

export class MainScene extends Phaser.Scene {
  private bird!: Phaser.Physics.Arcade.Sprite
  private obstacles!: Phaser.Physics.Arcade.Group
  private score = 0
  private startTime = 0
  private isAlive = true
  private obstacleTimer!: Phaser.Time.TimerEvent

  constructor() {
    super({ key: 'MainScene' })
  }

  preload() {
    // Create simple shapes as placeholders
    // In production: load actual sprites
    this.createBirdTexture()
    this.createObstacleTexture()
  }

  create() {
    this.isAlive = true
    this.score = 0
    this.startTime = Date.now()

    // Bird
    this.bird = this.physics.add.sprite(150, 300, 'bird')
    this.bird.setCollideWorldBounds(true)
    this.bird.body?.setSize(32, 32)

    // Obstacles group
    this.obstacles = this.physics.add.group()

    // Spawn obstacles every 1.5s
    this.obstacleTimer = this.time.addEvent({
      delay: 1500,
      callback: this.spawnObstacle,
      callbackScope: this,
      loop: true,
    })

    // Collision
    this.physics.add.collider(this.bird, this.obstacles, this.handleCrash, undefined, this)

    // Input
    this.input.on('pointerdown', this.flap, this)
    this.input.keyboard?.on('keydown-SPACE', this.flap, this)
  }

  update() {
    if (!this.isAlive) return

    // Check if bird hit bounds
    if (this.bird.y <= 0 || this.bird.y >= 600) {
      this.handleCrash()
    }

    // Update score (obstacles passed)
    this.obstacles.children.entries.forEach((obstacle) => {
      const sprite = obstacle as Phaser.Physics.Arcade.Sprite
      if (sprite.x < this.bird.x && !sprite.getData('passed')) {
        sprite.setData('passed', true)
        this.score++
      }
    })
  }

  private flap() {
    if (!this.isAlive) return
    this.bird.setVelocityY(-400)
  }

  private spawnObstacle() {
    if (!this.isAlive) return

    // Random gap position
    const gapY = Phaser.Math.Between(150, 450)
    const gapSize = 180

    // Top obstacle
    const top = this.obstacles.create(850, gapY - gapSize / 2 - 300, 'obstacle')
    top.setImmovable(true)
    top.body?.setAllowGravity(false)
    top.setVelocityX(-200)

    // Bottom obstacle
    const bottom = this.obstacles.create(850, gapY + gapSize / 2 + 300, 'obstacle')
    bottom.setImmovable(true)
    bottom.body?.setAllowGravity(false)
    bottom.setVelocityX(-200)

    // Cleanup off-screen obstacles
    this.obstacles.children.entries.forEach((obstacle) => {
      const sprite = obstacle as Phaser.Physics.Arcade.Sprite
      if (sprite.x < -100) {
        sprite.destroy()
      }
    })
  }

  private handleCrash() {
    if (!this.isAlive) return

    this.isAlive = false
    this.obstacleTimer.destroy()

    const timeMs = Date.now() - this.startTime

    // Callback to Vue
    const onCrash = this.registry.get('onCrash') as (
      timeMs: number,
      obstaclesPassed: number,
    ) => void
    onCrash(timeMs, this.score)

    // Stop physics
    this.physics.pause()

    // Visual feedback
    this.bird.setTint(0xff0000)
    this.cameras.main.shake(200, 0.01)
  }

  private createBirdTexture() {
    const graphics = this.add.graphics()
    graphics.fillStyle(0xffff00, 1)
    graphics.fillCircle(16, 16, 16)
    graphics.generateTexture('bird', 32, 32)
    graphics.destroy()
  }

  private createObstacleTexture() {
    const graphics = this.add.graphics()
    graphics.fillStyle(0x00ff00, 1)
    graphics.fillRect(0, 0, 80, 600)
    graphics.generateTexture('obstacle', 80, 600)
    graphics.destroy()
  }
}
```

---

## 🖼️ Vue Component con Overlay

### `FlappyScene.vue`

```vue
<template>
  <div class="flappy-scene">
    <!-- Phaser Canvas Container -->
    <div ref="gameContainer" class="game-container" />

    <!-- Vue HUD Overlay -->
    <div class="hud-overlay">
      <!-- Timer -->
      <div class="timer">
        {{ formatTime(elapsedTime) }}
      </div>

      <!-- Score -->
      <div class="score">Obstáculos: {{ obstaclesPassed }}</div>

      <!-- Scoreboard Compact -->
      <ScoreboardCompact v-if="showScoreboard" class="scoreboard-compact" />

      <!-- Game Over -->
      <div v-if="gameOver" class="game-over-modal">
        <div class="modal-content">
          <h2>¡Se acabó!</h2>
          <p>Tiempo: {{ formatTime(finalTime) }}</p>
          <p>Obstáculos: {{ finalObstacles }}</p>
          <p>Puntos: {{ finalPoints }}</p>

          <div class="actions">
            <button class="btn btn-primary" @click="restart">Reintentar</button>
            <button class="btn btn-ghost" @click="exitGame">Salir</button>
          </div>
        </div>
      </div>

      <!-- Instructions (if not dismissed) -->
      <div v-if="showInstructions" class="instructions-overlay">
        <div class="instructions-content">
          <h3>¿Cómo jugar?</h3>
          <p>🖱️ Click o toca para volar</p>
          <p>⌨️ También puedes usar ESPACIO</p>
          <p>🚫 No choques con los obstáculos ni los bordes</p>
          <button class="btn btn-primary" @click="dismissInstructions">¡Entendido!</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { FlappyGame } from './flappy.game'
import { useFlappyStore } from './flappy.store'
import { useAudio } from '@/modules/core/composables/useAudio'
import ScoreboardCompact from '@/modules/game/scoreboard/ScoreboardCompact.vue'

const router = useRouter()
const flappyStore = useFlappyStore()
const { playEffect } = useAudio()

const gameContainer = ref<HTMLElement>()
let flappyGame: FlappyGame | null = null

const elapsedTime = ref(0)
const obstaclesPassed = ref(0)
const gameOver = ref(false)
const finalTime = ref(0)
const finalObstacles = ref(0)
const finalPoints = ref(0)
const showInstructions = ref(true)
const showScoreboard = ref(true)

let timerInterval: number | null = null

onMounted(() => {
  if (!gameContainer.value) return

  flappyGame = new FlappyGame(gameContainer.value)
  flappyGame.init(handleCrash)

  startTimer()
})

onUnmounted(() => {
  flappyGame?.destroy()
  if (timerInterval) clearInterval(timerInterval)
})

function startTimer() {
  const startTime = Date.now()
  timerInterval = setInterval(() => {
    elapsedTime.value = Date.now() - startTime
  }, 100)
}

function handleCrash(timeMs: number, obstacles: number) {
  if (timerInterval) clearInterval(timerInterval)

  finalTime.value = timeMs
  finalObstacles.value = obstacles
  finalPoints.value = Math.floor(timeMs / 100)

  gameOver.value = true

  // Play crash sound
  playEffect('flappy_crash')

  // Submit to backend
  flappyStore.submitResult(timeMs, obstacles)
}

function restart() {
  gameOver.value = false
  elapsedTime.value = 0
  obstaclesPassed.value = 0

  flappyGame?.restart()
  startTimer()
}

function exitGame() {
  router.push('/lobby')
}

function dismissInstructions() {
  showInstructions.value = false
  localStorage.setItem('flappy_instructions_seen', 'true')
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const centiseconds = Math.floor((ms % 1000) / 10)
  return `${seconds}.${centiseconds.toString().padStart(2, '0')}s`
}

// Check if instructions already seen
onMounted(() => {
  if (localStorage.getItem('flappy_instructions_seen') === 'true') {
    showInstructions.value = false
  }
})
</script>

<style scoped>
.flappy-scene {
  @apply relative w-full h-screen overflow-hidden;
}

.game-container {
  @apply w-full h-full;
}

.hud-overlay {
  @apply absolute inset-0 pointer-events-none;
}

.hud-overlay > * {
  @apply pointer-events-auto;
}

.timer {
  @apply absolute top-4 left-4;
  @apply text-4xl font-bold text-white;
  @apply bg-black/50 px-4 py-2 rounded-lg;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
}

.score {
  @apply absolute top-4 right-4;
  @apply text-2xl font-bold text-white;
  @apply bg-black/50 px-4 py-2 rounded-lg;
}

.scoreboard-compact {
  @apply absolute bottom-4 left-4;
  @apply w-64;
}

.game-over-modal {
  @apply absolute inset-0 flex items-center justify-center;
  @apply bg-black/80;
}

.modal-content {
  @apply bg-base-100 p-8 rounded-lg shadow-2xl;
  @apply text-center space-y-4;
}

.modal-content h2 {
  @apply text-3xl font-bold;
}

.actions {
  @apply flex gap-4 justify-center mt-6;
}

.instructions-overlay {
  @apply absolute inset-0 flex items-center justify-center;
  @apply bg-black/70;
}

.instructions-content {
  @apply bg-base-100 p-8 rounded-lg shadow-2xl;
  @apply text-center space-y-4 max-w-md;
}

.instructions-content h3 {
  @apply text-2xl font-bold;
}

.instructions-content p {
  @apply text-lg;
}
</style>
```

---

## 🗄️ Pinia Store

### `flappy.store.ts`

```typescript
// src/modules/games/flappy/flappy.store.ts

import { defineStore } from 'pinia'
import { apiService } from '@/modules/core/services/api.service'

interface FlappyState {
  bestTime: number
  bestObstacles: number
  attempts: number
  loading: boolean
}

export const useFlappyStore = defineStore('flappy', {
  state: (): FlappyState => ({
    bestTime: 0,
    bestObstacles: 0,
    attempts: 0,
    loading: false,
  }),

  actions: {
    async submitResult(timeMs: number, obstaclesPassed: number) {
      this.loading = true

      try {
        const { data } = await apiService.post('/games/flappy/crash', {
          time_ms: timeMs,
          obstacles_passed: obstaclesPassed,
        })

        this.attempts++

        // Update personal bests
        if (timeMs > this.bestTime) {
          this.bestTime = timeMs
        }

        if (obstaclesPassed > this.bestObstacles) {
          this.bestObstacles = obstaclesPassed
        }

        return data
      } catch (error) {
        console.error('Error submitting flappy result:', error)
      } finally {
        this.loading = false
      }
    },

    async fetchStats() {
      try {
        const { data } = await apiService.get('/games/flappy/stats')
        this.bestTime = data.best_time_ms
        this.bestObstacles = data.best_obstacles
        this.attempts = data.attempts
      } catch (error) {
        console.error('Error fetching flappy stats:', error)
      }
    },
  },
})
```

---

## 📡 Backend

### Submit Result

```php
// app/Actions/Games/Flappy/SubmitCrash.php

public function handle(Player $player, int $roundId, int $timeMs, int $obstaclesPassed): void
{
    FlappyAttempt::create([
        'player_id' => $player->id,
        'round_id' => $roundId,
        'time_survived_ms' => $timeMs,
        'obstacles_passed' => $obstaclesPassed,
        'crashed_at' => now()
    ]);

    broadcast(new FlappyCrashed($player->id, $timeMs, $obstaclesPassed));

    // Check achievements
    AchievementService::check($player->id, 'flappy.crash', [
        'time_ms' => $timeMs
    ]);

    // Audit
    AuditService::log(
        actorId: $player->id,
        actorType: 'player',
        action: 'player.flappy_crash',
        targetType: 'game',
        targetId: 'flappy',
        context: [
            'round_id' => $roundId,
            'time_ms' => $timeMs,
            'obstacles' => $obstaclesPassed
        ]
    );
}
```

### Calculate Rankings

```php
// app/Actions/Games/Flappy/CalculateRankings.php

public function handle(int $roundId): void
{
    $attempts = FlappyAttempt::where('round_id', $roundId)
        ->orderBy('time_survived_ms', 'desc')
        ->get();

    // Assign ranks
    $attempts->each(function ($attempt, $index) {
        $attempt->update(['rank' => $index + 1]);
    });

    // Calculate scores (time_ms / 100)
    $attempts->each(function ($attempt) use ($roundId) {
        $points = floor($attempt->time_survived_ms / 100);

        PlayerScore::create([
            'player_id' => $attempt->player_id,
            'round_id' => $roundId,
            'game_id' => 'flappy',
            'points' => $points,
            'time_ms' => $attempt->time_survived_ms,
            'rank' => $attempt->rank
        ]);
    });

    ScoreboardService::updateFromFlappy($roundId);

    broadcast(new ScoreboardUpdated($roundId));
}
```

---

## 🗄️ Datos Guardados

```typescript
interface FlappyAttempt {
  id: number
  player_id: number
  round_id: number
  time_survived_ms: number
  obstacles_passed: number
  crashed_at: string
  rank: number | null
}
```

---

## 🏆 Achievements

- `play_both_bonus`: Jugar Flappy + Word Search
- `flappy_survivor_30s`: Sobrevivir >= 30s
- `flappy_survivor_60s`: Sobrevivir >= 60s
- `flappy_win`: Rank 1 en la ronda

---

## 🎨 Assets (Opcional)

### Sprites recomendados

- **Bird**: 32×32px, animación de aleteo (2-3 frames)
- **Obstacle**: 80×600px, textura de tubería verde
- **Background**: Parallax scrolling (cielo + nubes)
- **Ground**: Scrolling horizontal

### Sounds

- `flap.mp3`: Sonido de aleteo
- `crash.mp3`: Sonido de impacto
- `point.mp3`: Sonido al pasar obstáculo

---

## 📱 Responsive Design

```typescript
// Ajustar tamaño del game config basado en viewport
const width = Math.min(window.innerWidth, 800)
const height = Math.min(window.innerHeight, 600)

const config: Phaser.Types.Core.GameConfig = {
  width,
  height,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // ...
}
```

---

## 🛡️ Anti-Cheat

1. **Server validation**: Verificar tiempo plausible (max ~10 min)
2. **Rate limiting**: No permitir múltiples submits rápidos
3. **Session verification**: Verificar que jugador está en ronda activa
4. **Audit logs**: Registrar todos los intentos

```php
// Validation example
if ($timeMs > 600000) {  // 10 min max
    throw new \Exception('Tiempo sospechosamente alto');
}

if ($obstaclesPassed > ($timeMs / 1500) + 5) {
    // Impossible obstacle count
    AuditService::log(...);
    throw new \Exception('Datos inválidos');
}
```

---

**Última actualización**: Diciembre 21, 2025  
**Autor**: Flappy Bird - Phaser 3 + Vue HUD  
**Tecnología**: Phaser 3.80 physics engine con overlay Vue
