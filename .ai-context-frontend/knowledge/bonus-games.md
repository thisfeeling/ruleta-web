# Bonus Games Architecture

> **Juegos bonus opcionales**: ¡A buscar! (word-search) y No Lo Choques (flappy-bird)  
> **Activación**: Controlada por Supervisor  
> **Características**: Todos los jugadores participan, ranking por desempeño, no son eliminatorios obligatorios

---

## Concepto General

Los juegos bonus son **mini-juegos opcionales** que el Supervisor puede activar en cualquier momento entre los juegos principales. No eliminan jugadores, pero sí generan puntuación y ranking.

### Características Clave

- ✅ **Todos participan**: No hay espectadores
- ✅ **Activación manual**: Supervisor decide cuándo habilitar
- ✅ **Ranking en tiempo real**: Scoreboard unificado
- ✅ **Server-authoritative**: Backend valida todos los resultados
- ✅ **Anti-cheat**: Validación estricta de tiempos y resultados
- ❌ **No eliminatorios**: Solo generan puntos/ventajas

---

## 1. ¡A buscar! (Word Search / Sopa de Letras)

### Descripción

Sopa de letras clásica donde los jugadores deben encontrar palabras ocultas en una grilla de letras. **El primer jugador en completar todas las palabras gana**.

### Mecánica

**Objetivo**: Encontrar todas las palabras en el menor tiempo posible

**Reglas**:

- Grid 10×10 o 15×15 (configurable)
- 5-8 palabras ocultas
- Selección con mouse/touch (drag)
- Timer visible
- Backend genera mismo grid para todos

**Condición de victoria**:

```typescript
// Opción 1: Primer jugador en encontrar todas
winner = firstToComplete()

// Opción 2: Más palabras en tiempo límite
winner = mostWordsInTime(180_000) // 3 minutos
```

### Tecnología: Vue 3 + HTML/CSS

**❌ NO usar Phaser o Three.js** - Innecesario y contraproducente

**✅ Razones**:

- Grid responsivo con CSS Grid
- Selección natural con eventos DOM
- Accesibilidad garantizada
- Fácil sincronización con Reverb
- Performance excelente

### Estructura del Módulo

```
src/modules/games/word-search/
├── WordSearchScene.vue       # Contenedor principal
├── WordSearchGrid.vue        # Grid interactivo (HTML/CSS)
├── word-search.store.ts      # Estado local (Pinia)
├── word-search.logic.ts      # Generación grid + validación
├── word-search.socket.ts     # Listeners WebSocket
└── word-search.types.ts      # Interfaces TypeScript
```

### Componente Principal

```vue
<!-- WordSearchScene.vue -->
<template>
  <div class="word-search-container">
    <div class="hud">
      <ScoreDisplay :time="elapsedTime" />
      <WordList :words="words" :found="foundWords" />
    </div>

    <WordSearchGrid :grid="grid" :found-cells="foundCells" @word-selected="handleWordSelection" />

    <div class="live-ranking">
      <PlayerRanking :players="ranking" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useWordSearchStore } from './word-search.store'
import { useWordSearchSocket } from './word-search.socket'
import WordSearchGrid from './WordSearchGrid.vue'

const store = useWordSearchStore()
const { channel } = useWordSearchSocket()

onMounted(() => {
  store.initialize()
})

onUnmounted(() => {
  channel.stopListening('bonus.word-search.started')
  channel.stopListening('bonus.word-search.ended')
})
</script>
```

### Grid Component (Técnica)

```vue
<!-- WordSearchGrid.vue -->
<template>
  <div
    class="grid"
    :style="{
      gridTemplateColumns: `repeat(${size}, 1fr)`,
    }"
  >
    <div
      v-for="cell in grid"
      :key="cell.id"
      class="cell"
      :class="{
        found: cell.isFound,
        selecting: cell.isSelecting,
      }"
      @mousedown="startSelection(cell)"
      @mouseenter="continueSelection(cell)"
      @mouseup="endSelection"
      @touchstart.prevent="startSelection(cell)"
      @touchmove.prevent="handleTouchMove"
      @touchend.prevent="endSelection"
    >
      {{ cell.letter }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { GridCell } from './word-search.types'

const props = defineProps<{
  grid: GridCell[]
  foundCells: number[]
  size: number
}>()

const emit = defineEmits<{
  (e: 'word-selected', cells: number[]): void
}>()

const selecting = ref<number[]>([])

function startSelection(cell: GridCell) {
  selecting.value = [cell.id]
}

function continueSelection(cell: GridCell) {
  if (selecting.value.length > 0) {
    selecting.value.push(cell.id)
  }
}

function endSelection() {
  if (selecting.value.length > 1) {
    emit('word-selected', selecting.value)
  }
  selecting.value = []
}
</script>

<style scoped>
.grid {
  display: grid;
  gap: 4px;
  padding: 1rem;
  background: hsl(var(--b3));
  border-radius: 8px;
}

.cell {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: bold;
  background: hsl(var(--b1));
  border: 2px solid hsl(var(--bc) / 0.1);
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  transition: all 0.15s;
}

.cell:hover {
  background: hsl(var(--p) / 0.1);
  border-color: hsl(var(--p));
}

.cell.selecting {
  background: hsl(var(--s) / 0.3);
  border-color: hsl(var(--s));
}

.cell.found {
  background: hsl(var(--su) / 0.3);
  border-color: hsl(var(--su));
  color: hsl(var(--suc));
}
</style>
```

### Lógica de Generación (word-search.logic.ts)

```typescript
export interface GridCell {
  id: number
  letter: string
  row: number
  col: number
  isFound: boolean
  isSelecting: boolean
}

export interface WordPlacement {
  word: string
  cells: number[]
  direction: 'horizontal' | 'vertical' | 'diagonal'
}

export function generateGrid(
  words: string[],
  size: number = 10,
): { grid: GridCell[]; placements: WordPlacement[] } {
  const grid: GridCell[] = []
  const placements: WordPlacement[] = []

  // 1. Crear grid vacío
  for (let i = 0; i < size * size; i++) {
    grid.push({
      id: i,
      letter: '',
      row: Math.floor(i / size),
      col: i % size,
      isFound: false,
      isSelecting: false,
    })
  }

  // 2. Colocar palabras (algoritmo simplificado)
  for (const word of words) {
    const placement = placeWord(grid, word, size)
    if (placement) {
      placements.push(placement)
    }
  }

  // 3. Rellenar espacios vacíos con letras aleatorias
  for (const cell of grid) {
    if (!cell.letter) {
      cell.letter = randomLetter()
    }
  }

  return { grid, placements }
}

function placeWord(grid: GridCell[], word: string, size: number): WordPlacement | null {
  // Intentar colocar en direcciones aleatorias
  const directions: WordPlacement['direction'][] = ['horizontal', 'vertical', 'diagonal']

  for (const direction of shuffle(directions)) {
    const placement = tryPlaceWord(grid, word, size, direction)
    if (placement) {
      // Escribir letras en el grid
      placement.cells.forEach((cellId, i) => {
        grid[cellId].letter = word[i]
      })
      return placement
    }
  }

  return null
}

function tryPlaceWord(
  grid: GridCell[],
  word: string,
  size: number,
  direction: WordPlacement['direction'],
): WordPlacement | null {
  // Lógica para encontrar posición válida
  // (simplificado - implementar con validaciones completas)

  const maxAttempts = 100
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const startRow = Math.floor(Math.random() * size)
    const startCol = Math.floor(Math.random() * size)

    const cells = getCellsForPlacement(startRow, startCol, word.length, direction, size)

    if (cells && isValidPlacement(grid, cells)) {
      return { word, cells, direction }
    }
  }

  return null
}

function getCellsForPlacement(
  row: number,
  col: number,
  length: number,
  direction: WordPlacement['direction'],
  size: number,
): number[] | null {
  const cells: number[] = []

  for (let i = 0; i < length; i++) {
    let r = row
    let c = col

    switch (direction) {
      case 'horizontal':
        c += i
        break
      case 'vertical':
        r += i
        break
      case 'diagonal':
        r += i
        c += i
        break
    }

    // Validar bounds
    if (r < 0 || r >= size || c < 0 || c >= size) {
      return null
    }

    cells.push(r * size + c)
  }

  return cells
}

function isValidPlacement(grid: GridCell[], cells: number[]): boolean {
  return cells.every((cellId) => {
    const cell = grid[cellId]
    return !cell.letter || cell.letter === ''
  })
}

function randomLetter(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  return letters[Math.floor(Math.random() * letters.length)]
}

function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function validateWord(selectedCells: number[], placements: WordPlacement[]): string | null {
  for (const placement of placements) {
    if (arraysEqual(selectedCells, placement.cells)) {
      return placement.word
    }
  }
  return null
}

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort((x, y) => x - y)
  const sortedB = [...b].sort((x, y) => x - y)
  return sortedA.every((val, i) => val === sortedB[i])
}
```

### Store (word-search.store.ts)

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GridCell, WordPlacement } from './word-search.types'
import { generateGrid, validateWord } from './word-search.logic'

export const useWordSearchStore = defineStore('wordSearch', () => {
  // State
  const grid = ref<GridCell[]>([])
  const words = ref<string[]>([])
  const placements = ref<WordPlacement[]>([])
  const foundWords = ref<string[]>([])
  const startTime = ref<number | null>(null)
  const endTime = ref<number | null>(null)
  const isActive = ref(false)

  // Computed
  const elapsedTime = computed(() => {
    if (!startTime.value) return 0
    const end = endTime.value || Date.now()
    return end - startTime.value
  })

  const isComplete = computed(() => {
    return foundWords.value.length === words.value.length
  })

  const progress = computed(() => {
    if (words.value.length === 0) return 0
    return (foundWords.value.length / words.value.length) * 100
  })

  // Actions
  function initialize(serverWords: string[]) {
    words.value = serverWords
    const generated = generateGrid(serverWords, 10)
    grid.value = generated.grid
    placements.value = generated.placements
    foundWords.value = []
    startTime.value = Date.now()
    endTime.value = null
    isActive.value = true
  }

  function selectWord(cellIds: number[]): string | null {
    const word = validateWord(cellIds, placements.value)

    if (word && !foundWords.value.includes(word)) {
      foundWords.value.push(word)

      // Marcar celdas como encontradas
      cellIds.forEach((id) => {
        const cell = grid.value[id]
        if (cell) {
          cell.isFound = true
        }
      })

      // Check si completó
      if (isComplete.value) {
        complete()
      }

      return word
    }

    return null
  }

  function complete() {
    endTime.value = Date.now()
    isActive.value = false
  }

  function reset() {
    grid.value = []
    words.value = []
    placements.value = []
    foundWords.value = []
    startTime.value = null
    endTime.value = null
    isActive.value = false
  }

  return {
    // State
    grid,
    words,
    foundWords,
    startTime,
    endTime,
    isActive,

    // Computed
    elapsedTime,
    isComplete,
    progress,

    // Actions
    initialize,
    selectWord,
    complete,
    reset,
  }
})
```

### WebSocket Integration (word-search.socket.ts)

```typescript
import { echoService } from '@/modules/core/services/echo.service'
import { useWordSearchStore } from './word-search.store'
import { audioService } from '@/modules/core/services/audio.service'

export function useWordSearchSocket() {
  const store = useWordSearchStore()
  const channel = echoService.private('bonus.word-search')

  // Juego iniciado por supervisor
  channel.listen('BonusWordSearchStarted', (event: { words: string[]; timeLimit: number }) => {
    store.initialize(event.words)
    audioService.playVoice('bonus/word-search-start')
  })

  // Jugador encontró palabra
  channel.listen('WordFound', (event: { playerId: number; word: string; timestamp: number }) => {
    // Solo para feedback visual en ranking
    console.log(`Player ${event.playerId} found: ${event.word}`)
  })

  // Jugador completó el juego
  channel.listen(
    'PlayerCompleted',
    (event: { playerId: number; time: number; ranking: number }) => {
      audioService.playSfx('results/complete')
    },
  )

  // Juego terminado (timeout o alguien ganó)
  channel.listen(
    'BonusWordSearchEnded',
    (event: {
      winner: {
        playerId: number
        nickname: string
        time: number
      }
      rankings: Array<{
        playerId: number
        nickname: string
        wordsFound: number
        time: number
      }>
    }) => {
      store.complete()

      if (event.winner.playerId === store.currentPlayerId) {
        audioService.playVoice('results/winner')
      }
    },
  )

  return { channel }
}
```

### Anti-Cheat

**Validaciones Backend**:

```php
// app/Domain/Bonus/Actions/ValidateWordSearchAction.php

class ValidateWordSearchAction
{
    public function execute(
        Player $player,
        array $cellIds,
        int $clientTimestamp
    ): bool {
        $session = BonusSession::current();

        // 1. Validar que el juego esté activo
        if (!$session->isActive()) {
            throw new GameNotActiveException();
        }

        // 2. Validar que las celdas formen una palabra válida
        $word = $this->validateCells($cellIds, $session->placements);
        if (!$word) {
            return false;
        }

        // 3. Validar que no haya encontrado esta palabra antes
        if ($session->hasPlayerFoundWord($player, $word)) {
            throw new DuplicateWordException();
        }

        // 4. Validar tiempo (anti speed-hack)
        $serverTime = now()->timestamp;
        $timeDiff = abs($serverTime - $clientTimestamp);

        if ($timeDiff > 5) { // Más de 5 segundos de diferencia
            Log::warning('Word search time mismatch', [
                'player_id' => $player->id,
                'diff' => $timeDiff
            ]);
        }

        // 5. Registrar palabra encontrada
        $session->markWordFound($player, $word, $serverTime);

        // 6. Broadcast
        event(new WordFound($player, $word, $serverTime));

        // 7. Check si completó
        if ($session->hasPlayerCompletedAll($player)) {
            $this->handleCompletion($player, $session);
        }

        return true;
    }

    private function handleCompletion(Player $player, BonusSession $session): void
    {
        $time = now()->diffInMilliseconds($session->started_at);

        // Registrar en scoreboard
        app(ScoreboardService::class)->addBonusScore(
            player: $player,
            game: 'word-search',
            score: $this->calculateScore($time),
            metadata: ['time' => $time]
        );

        event(new PlayerCompletedWordSearch($player, $time));

        // Si es el primero, puede terminar el juego
        if ($session->isFirstToComplete()) {
            $this->endGame($session);
        }
    }

    private function calculateScore(int $timeMs): int
    {
        // Menos tiempo = más puntos
        $maxPoints = 1000;
        $maxTime = 300000; // 5 minutos

        return max(0, $maxPoints - floor(($timeMs / $maxTime) * $maxPoints));
    }
}
```

---

## 2. No Lo Choques (Flappy Bird)

### Descripción

Clon de Flappy Bird donde los jugadores controlan un pájaro que debe evitar obstáculos. **Gana quien sobreviva más tiempo**.

### Mecánica

**Objetivo**: Sobrevivir el mayor tiempo posible sin chocar

**Reglas**:

- Click/Tap para saltar (impulso hacia arriba)
- Gravedad constante
- Pipes aparecen periódicamente
- Chocar = game over
- Timer acumula tiempo de vida

**Condición de victoria**:

```typescript
winner = longestSurvivalTime()
```

### Tecnología: Phaser 3

**✅ Razones para usar Phaser**:

- Game loop integrado (60fps)
- Física simple (gravedad, colisiones)
- Sprites y animaciones
- Input handling robusto
- Muy usado para juegos 2D tipo arcade

### Estructura del Módulo

```
src/modules/games/flappy/
├── FlappyScene.vue           # Contenedor Vue
├── flappy.game.ts            # Instancia Phaser
├── flappy.scenes.ts          # Escenas Phaser (Main, GameOver)
├── flappy.store.ts           # Estado (Pinia)
├── flappy.socket.ts          # WebSocket
├── flappy.logic.ts           # Scoring y validación
└── flappy.types.ts           # Interfaces
```

### Componente Vue (FlappyScene.vue)

```vue
<template>
  <div class="flappy-container">
    <div class="hud">
      <div class="timer">{{ formatTime(elapsedTime) }}</div>
      <div class="status">{{ status }}</div>
    </div>

    <!-- Phaser se monta aquí -->
    <div id="flappy-game" class="game-canvas"></div>

    <div class="live-ranking">
      <div v-for="player in topPlayers" :key="player.id" class="rank-item">
        <span class="rank">{{ player.rank }}</span>
        <span class="nickname">{{ player.nickname }}</span>
        <span class="time">{{ formatTime(player.survivalTime) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useFlappyStore } from './flappy.store'
import { useFlappySocket } from './flappy.socket'
import { createFlappyGame } from './flappy.game'
import type Phaser from 'phaser'

const store = useFlappyStore()
const { channel } = useFlappySocket()

let game: Phaser.Game | null = null

const elapsedTime = ref(0)
const status = ref<'waiting' | 'playing' | 'crashed'>('waiting')

onMounted(() => {
  // Crear instancia Phaser
  game = createFlappyGame({
    parent: 'flappy-game',
    onStart: handleStart,
    onCrash: handleCrash,
    onTimeUpdate: handleTimeUpdate,
  })
})

onUnmounted(() => {
  // CRÍTICO: Destruir Phaser al desmontar
  if (game) {
    game.destroy(true)
    game = null
  }

  channel.stopListening('bonus.flappy.started')
  channel.stopListening('bonus.flappy.ended')
})

function handleStart() {
  status.value = 'playing'
  store.startGame()
}

function handleCrash(time: number) {
  status.value = 'crashed'
  store.crash(time)

  // Enviar resultado al backend
  store.submitResult(time)
}

function handleTimeUpdate(time: number) {
  elapsedTime.value = time
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const milliseconds = ms % 1000
  return `${seconds}.${String(milliseconds).padStart(3, '0')}`
}
</script>

<style scoped>
.flappy-container {
  position: relative;
  width: 100%;
  height: 100vh;
  background: linear-gradient(to bottom, #87ceeb 0%, #e0f6ff 100%);
}

.hud {
  position: absolute;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  gap: 2rem;
  padding: 1rem 2rem;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 8px;
  color: white;
}

.timer {
  font-size: 2rem;
  font-weight: bold;
  font-family: 'Orbitron', monospace;
}

.game-canvas {
  width: 100%;
  height: 100%;
}

.live-ranking {
  position: absolute;
  top: 5rem;
  right: 1rem;
  width: 250px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 8px;
  padding: 1rem;
  color: white;
}

.rank-item {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem;
  margin-bottom: 0.25rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.rank {
  font-weight: bold;
  min-width: 2rem;
}
</style>
```

### Phaser Game Instance (flappy.game.ts)

```typescript
import Phaser from 'phaser'
import { MainScene } from './flappy.scenes'

export interface FlappyGameConfig {
  parent: string
  onStart: () => void
  onCrash: (time: number) => void
  onTimeUpdate: (time: number) => void
}

export function createFlappyGame(config: FlappyGameConfig): Phaser.Game {
  const gameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: config.parent,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 1000, x: 0 },
        debug: false,
      },
    },
    scene: [new MainScene(config)],
    backgroundColor: '#87CEEB',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  }

  return new Phaser.Game(gameConfig)
}
```

### Phaser Scenes (flappy.scenes.ts)

```typescript
import Phaser from 'phaser'
import type { FlappyGameConfig } from './flappy.game'

export class MainScene extends Phaser.Scene {
  private bird!: Phaser.Physics.Arcade.Sprite
  private pipes!: Phaser.Physics.Arcade.Group
  private startTime: number = 0
  private crashed: boolean = false
  private config: FlappyGameConfig

  constructor(config: FlappyGameConfig) {
    super({ key: 'MainScene' })
    this.config = config
  }

  preload() {
    // Cargar assets (usar placeholders o sprites reales)
    // En producción, estos vendrían de assets/images/flappy/
    this.load.image('bird', '/assets/images/flappy/bird.png')
    this.load.image('pipe', '/assets/images/flappy/pipe.png')
  }

  create() {
    // Crear pájaro
    this.bird = this.physics.add.sprite(100, 300, 'bird')
    this.bird.setScale(0.5)
    this.bird.setCollideWorldBounds(true)

    // Crear grupo de pipes
    this.pipes = this.physics.add.group()

    // Input
    this.input.on('pointerdown', () => this.flap())
    this.input.keyboard?.on('keydown-SPACE', () => this.flap())

    // Colisiones
    this.physics.add.collider(this.bird, this.pipes, () => this.handleCrash())

    // Spawn pipes periódicamente
    this.time.addEvent({
      delay: 2000,
      callback: () => this.spawnPipe(),
      loop: true,
    })

    // Iniciar timer
    this.startTime = Date.now()
    this.config.onStart()
  }

  update() {
    if (this.crashed) return

    // Actualizar tiempo
    const elapsed = Date.now() - this.startTime
    this.config.onTimeUpdate(elapsed)

    // Check si cayó al suelo (sin pipe)
    if (this.bird.y > 580) {
      this.handleCrash()
    }

    // Rotar bird según velocidad
    if (this.bird.body) {
      const angle = Phaser.Math.Clamp(this.bird.body.velocity.y * 0.1, -30, 90)
      this.bird.setAngle(angle)
    }
  }

  flap() {
    if (this.crashed) return
    this.bird.setVelocityY(-350)
  }

  spawnPipe() {
    if (this.crashed) return

    const gap = 150
    const minHeight = 50
    const maxHeight = 400
    const topHeight = Phaser.Math.Between(minHeight, maxHeight)

    // Pipe superior
    const topPipe = this.pipes.create(850, topHeight / 2, 'pipe')
    topPipe.setDisplaySize(80, topHeight)
    topPipe.setVelocityX(-200)

    // Pipe inferior
    const bottomPipe = this.pipes.create(850, topHeight + gap + (600 - topHeight - gap) / 2, 'pipe')
    bottomPipe.setDisplaySize(80, 600 - topHeight - gap)
    bottomPipe.setVelocityX(-200)

    // Destruir pipes fuera de pantalla
    topPipe.setData('destroyX', -100)
    bottomPipe.setData('destroyX', -100)
  }

  handleCrash() {
    if (this.crashed) return

    this.crashed = true
    this.bird.setTint(0xff0000)
    this.physics.pause()

    const survivalTime = Date.now() - this.startTime
    this.config.onCrash(survivalTime)
  }
}
```

### Store (flappy.store.ts)

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiService } from '@/modules/core/services/api.service'

export const useFlappyStore = defineStore('flappy', () => {
  const startTime = ref<number | null>(null)
  const endTime = ref<number | null>(null)
  const survivalTime = ref<number>(0)
  const isActive = ref(false)
  const submitted = ref(false)

  function startGame() {
    startTime.value = Date.now()
    endTime.value = null
    survivalTime.value = 0
    isActive.value = true
    submitted.value = false
  }

  function crash(time: number) {
    endTime.value = Date.now()
    survivalTime.value = time
    isActive.value = false
  }

  async function submitResult(time: number) {
    if (submitted.value) return

    try {
      submitted.value = true

      await apiService.post('/bonus/flappy/result', {
        survival_time: time,
        timestamp: Date.now(),
      })

      console.log('Result submitted:', time)
    } catch (error) {
      console.error('Failed to submit result:', error)
      submitted.value = false
    }
  }

  function reset() {
    startTime.value = null
    endTime.value = null
    survivalTime.value = 0
    isActive.value = false
    submitted.value = false
  }

  return {
    startTime,
    endTime,
    survivalTime,
    isActive,
    submitted,
    startGame,
    crash,
    submitResult,
    reset,
  }
})
```

### Anti-Cheat (Backend)

```php
// app/Domain/Bonus/Actions/ValidateFlappyResultAction.php

class ValidateFlappyResultAction
{
    public function execute(
        Player $player,
        int $survivalTimeMs,
        int $clientTimestamp
    ): bool {
        $session = BonusSession::current();

        // 1. Validar que el juego esté activo
        if (!$session->isActive()) {
            throw new GameNotActiveException();
        }

        // 2. Validar tiempo razonable (anti-cheat)
        $maxReasonableTime = 300000; // 5 minutos es sospechoso

        if ($survivalTimeMs > $maxReasonableTime) {
            Log::warning('Flappy Bird suspicious time', [
                'player_id' => $player->id,
                'time' => $survivalTimeMs
            ]);

            // Limitar a máximo razonable
            $survivalTimeMs = $maxReasonableTime;
        }

        if ($survivalTimeMs < 1000) {
            // Menos de 1 segundo = probablemente crash inmediato
            // Aceptable pero no genera puntos
        }

        // 3. Validar que no haya enviado resultado antes
        if ($session->hasPlayerSubmitted($player)) {
            throw new DuplicateSubmissionException();
        }

        // 4. Validar timestamp
        $serverTime = now()->timestamp;
        $timeDiff = abs($serverTime - $clientTimestamp);

        if ($timeDiff > 10) {
            Log::warning('Flappy Bird time mismatch', [
                'player_id' => $player->id,
                'diff' => $timeDiff
            ]);
        }

        // 5. Registrar resultado
        $session->recordResult($player, $survivalTimeMs, $serverTime);

        // 6. Calcular score
        $score = $this->calculateScore($survivalTimeMs);

        app(ScoreboardService::class)->addBonusScore(
            player: $player,
            game: 'flappy',
            score: $score,
            metadata: ['survival_time' => $survivalTimeMs]
        );

        // 7. Broadcast
        event(new PlayerCrashedFlappy($player, $survivalTimeMs));

        // 8. Actualizar ranking en tiempo real
        $this->broadcastRankings($session);

        return true;
    }

    private function calculateScore(int $timeMs): int
    {
        // Más tiempo = más puntos (lineal)
        return floor($timeMs / 100); // 1 punto cada 0.1 segundos
    }

    private function broadcastRankings(BonusSession $session): void
    {
        $rankings = $session->results()
            ->orderByDesc('survival_time')
            ->limit(10)
            ->get()
            ->map(fn($result, $index) => [
                'rank' => $index + 1,
                'player_id' => $result->player_id,
                'nickname' => $result->player->nickname,
                'survival_time' => $result->survival_time
            ]);

        event(new FlappyRankingsUpdated($rankings));
    }
}
```

---

## Integration with Main Game Flow

### Supervisor Controls

El Supervisor puede activar bonus games en cualquier momento:

```vue
<!-- SupervisorDashboard.vue (fragment) -->
<div class="bonus-controls">
  <button 
    @click="startBonusGame('word-search')"
    :disabled="bonusGameActive"
    class="btn btn-primary"
  >
    🔍 Iniciar Sopa de Letras
  </button>
  
  <button 
    @click="startBonusGame('flappy')"
    :disabled="bonusGameActive"
    class="btn btn-primary"
  >
    🐦 Iniciar Flappy Bird
  </button>
  
  <button 
    v-if="bonusGameActive"
    @click="endBonusGame()"
    class="btn btn-error"
  >
    ⏹️ Terminar Juego Bonus
  </button>
</div>
```

### Router Integration

```typescript
// router/index.ts (additions)

export const routes = [
  // ... existing routes

  {
    path: '/bonus/word-search',
    name: 'BonusWordSearch',
    component: () => import('@/modules/games/word-search/WordSearchScene.vue'),
    meta: { requiresAuth: true, layout: 'game' },
  },

  {
    path: '/bonus/flappy',
    name: 'BonusFlappy',
    component: () => import('@/modules/games/flappy/FlappyScene.vue'),
    meta: { requiresAuth: true, layout: 'game' },
  },
]
```

### State Machine Integration

Los bonus games NO entran en el state machine principal. Son "paralelos" al flujo:

```
MAIN FLOW              BONUS GAMES (optional, anytime)
=========              ===================================
LOBBY
  ↓                         ↓ (supervisor triggers)
MILLIONAIRE  ←────────  WORD_SEARCH (bonus)
  ↓                         ↓ (ends)
SPELL        ←────────  FLAPPY (bonus)
  ↓
...
```

---

## Performance Considerations

### Word Search

- ✅ Ligero (HTML/CSS)
- ✅ Escala bien (50 jugadores viendo mismo grid)
- ⚠️ Cuidado con eventos drag en mobile (throttle recomendado)

### Flappy Bird

- ⚠️ Phaser es pesado (cada jugador corre su propio loop)
- ✅ Pero es local (no sincroniza frames)
- ✅ WebGL vs Canvas2D auto-detect
- ⚠️ Memoria: destruir game al desmontar componente

---

## Testing Strategy

### Word Search

1. Grid generation (palabras siempre colocables)
2. Selección válida vs inválida
3. Timing validations
4. Duplicate word prevention

### Flappy Bird

1. Collision detection accuracy
2. Reasonable time limits (anti-cheat)
3. Memory leaks (Phaser lifecycle)
4. Mobile touch vs desktop click

---

## Summary

| Feature           | Word Search       | Flappy Bird      |
| ----------------- | ----------------- | ---------------- |
| **Tech**          | Vue + HTML/CSS    | Phaser 3         |
| **Complejidad**   | Baja              | Media            |
| **Performance**   | Excelente         | Buena            |
| **Mobile**        | Excelente         | Buena            |
| **Maintenance**   | Fácil             | Media            |
| **Win Condition** | First to complete | Longest survival |
| **Eliminatorio**  | No                | No               |
| **Scoring**       | Time-based        | Time-based       |

Ambos juegos son **server-authoritative**, usan el **scoreboard unificado**, y se integran perfectamente con el sistema de **audio** y **WebSockets** existente.

---

**Última actualización**: Diciembre 20, 2025  
**Versión**: 1.0.0
