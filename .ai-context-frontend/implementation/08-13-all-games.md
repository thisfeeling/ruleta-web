# 08-13 - Juegos Principales (Rope, Spell, Roulette) y Bonus

**Status**: [x] Completed

---

## 📋 Overview

Guía consolidada para implementación de todos los juegos restantes: La Cuerda, Deletréalo, La Ruleta, ¡A Buscar! (Word Search), y No Lo Choques (Flappy Bird).

---

## 🎮 08 - LA CUERDA (Rope Game)

### Files to Create

```
src/modules/games/rope/
├── rope.store.ts
├── rope.logic.ts (grouping algorithm)
├── rope.socket.ts
├── rope.visual.ts (Three.js 3D rope)
├── RopeScene.vue
└── components/
    ├── RopeVisual3D.vue
    ├── TensionMeter.vue
    └── GroupIndicator.vue
```

### Key Features

- [x] **Grouping Algorithm**: Divide jugadores en grupos (2-4 jugadores por grupo)
- [x] **Voting System**: Cada jugador vota a quién jalar (opcional)
- [x] **Click Battle**: Jugadores hacen clic rápido para aumentar tensión
- [x] **Three.js Visual**: Cuerda 3D que se tensa según clics acumulados
- [x] **Group Elimination**: Grupo perdedor eliminado completo

### Store Structure

```typescript
interface RopeState {
  groups: Group[]
  currentGroup: Group | null
  tension: number
  maxTension: number
  isSnapped: boolean
  clicksPerPlayer: Map<number, number>
}

interface Group {
  id: number
  players: Player[]
  totalClicks: number
  status: 'waiting' | 'playing' | 'passed' | 'eliminated'
}
```

### Visual (Three.js)

- Use `@tresjs/core` for Vue 3 integration
- Render rope as cylinder mesh with dynamic scaling
- Apply tension animation (length, thickness)
- Snap animation when tension > maxTension
- Ambient lighting + spotlight on rope

### WebSocket Events

- [ ] `RoundStarted` - Groups assigned
- [ ] `TensionUpdated` - Real-time tension (clics acumulados)
- [ ] `RopeSnapped` - Grupo perdió
- [ ] `GroupEliminated` - Grupo eliminado
- [ ] `RoundComplete` - Todos los grupos jugaron

---

## 🎮 09 - DELETRÉALO (Spell Game)

### Files to Create

```
src/modules/games/spell/
├── spell.store.ts
├── spell.logic.ts (word validation)
├── spell.socket.ts
├── spell.visual.ts (Three.js 3D bomb)
├── SpellScene.vue
└── components/
    ├── BombVisual3D.vue
    ├── AudioRecorder.vue
    ├── WordDisplay.vue
    └── ValidationStatus.vue
```

### Key Features

- [ ] **Individual Turns**: Un jugador a la vez
- [ ] **Audio Recording**: Grabar palabra deletreada con Web Audio API
- [ ] **Supervisor Validation**: Supervisor aprueba/rechaza audio
- [ ] **Three.js Bomb**: Bomba 3D que se infla con tiempo
- [ ] **Explosion**: Bomba explota si tiempo se acaba o respuesta incorrecta

### Store Structure

```typescript
interface SpellState {
  currentWord: string
  currentPlayer: Player | null
  timeLeft: number
  audioBlob: Blob | null
  audioUrl: string | null
  isRecording: boolean
  isValidating: boolean
  validationResult: 'pending' | 'approved' | 'rejected' | null
}
```

### Audio Recording

```typescript
// Use MediaRecorder API
const recorder = new MediaRecorder(stream)
recorder.start()
// On stop: get Blob, send to server
```

### Visual (Three.js)

- Sphere geometry that inflates from 1× to 3.5× scale
- Texture: Bomb with fuse
- Particle explosion effect on failure
- Timer-based inflation animation

### WebSocket Events

- [x] `PlayerSelected` - Turno de jugador
- [x] `WordAssigned` - Palabra a deletrear
- [x] `AudioUploaded` - Audio enviado, esperando validación
- [x] `AudioValidated` - Supervisor aprobó/rechazó
- [x] `BombExploded` - Jugador eliminado

---

## 🎮 10 - LA RULETA (Roulette Game - FINAL)

### Files to Create

```
src/modules/games/roulette/
├── roulette.store.ts
├── roulette.logic.ts (spin mechanics)
├── roulette.socket.ts
├── RouletteScene.vue
└── components/
    ├── RouletteWheel.vue (SVG or Canvas)
    ├── SpinButton.vue
    └── ResultDisplay.vue
```

### Key Features

- [ ] **Final Game**: Solo 2-5 jugadores llegan aquí
- [ ] **Spin Mechanics**: Cada jugador gira la ruleta
- [ ] **Binary Result**: WIN (avanza) o LOSE (eliminado)
- [ ] **Last Standing**: El último jugador que no sea eliminado gana
- [ ] **Dramatic Animation**: Ruleta gira con anticipación

### Store Structure

```typescript
interface RouletteState {
  remainingPlayers: Player[]
  currentPlayer: Player | null
  isSpinning: boolean
  spinResult: 'win' | 'lose' | null
  spinAngle: number
}
```

### Wheel Visual

- SVG/Canvas-based wheel with WIN/LOSE segments
- Smooth easing animation (ease-out)
- Sound effects (spin, tick, stop)
- Confetti on WIN

### WebSocket Events

- [x] `SpinStarted` - Jugador gira
- [x] `SpinResult` - Resultado (win/lose)
- [x] `PlayerEliminated` - Jugador eliminado
- [x] `WinnerDeclared` - Ganador final

---

## 🎮 11 - ¡A BUSCAR! (Word Search Bonus)

### Files to Create

```
src/modules/games/word-search/
├── word-search.audio.ts (text-to-speech)
├── word-search.types.ts (types/interfaces)
├── word-search.store.ts
├── word-search.logic.ts (generation + validation)
├── word-search.socket.ts
├── WordSearchScene.vue
└── components/
    ├── WordSearchGrid.vue (Pure HTML/CSS Grid)
    ├── WordList.vue
    └── TimerComponent.vue
```

### Key Features

- [x] **Non-Elimination**: Nadie es eliminado, solo puntos
- [x] **15×15 Grid**: HTML/CSS Grid, no canvas
- [x] **Drag Selection**: Click + drag para seleccionar palabras
- [x] **8 Direcciones**: Horizontal, vertical, diagonal (4 direcciones diagonales)
- [x] **Time Limit**: 3-5 minutos
- [x] **Scoring**: Puntos por palabra encontrada

### Store Structure

```typescript
interface WordSearchState {
  grid: string[][] // 15x15
  words: string[]
  foundWords: Set<string>
  selectedCells: Cell[]
  timeLeft: number
  score: number
}

interface Cell {
  row: number
  col: number
  letter: string
}
```

### Grid Generation

```typescript
// Place words in grid
function placeWord(word: string, direction: Direction) {
  // Calculate start position
  // Place each letter in grid
}

// Fill empty cells with random letters
function fillEmptyCells() {
  // Random A-Z
}
```

### Drag Selection

```typescript
// Mouse down: start selection
// Mouse move: extend selection
// Mouse up: validate selection
```

### WebSocket Events

- [x] `GridGenerated` - Sopa de letras generada
- [x] `WordFound` - Jugador encontró palabra
- [x] `GameCompleted` - Tiempo agotado

---

## 🎮 12 - NO LO CHOQUES (Flappy Bird Bonus)

### Files to Create

```
src/modules/games/flappy/
├── flappy.store.ts
├── flappy.game.ts (Phaser setup)
├── flappy.scenes.ts (MainScene)
├── flappy.socket.ts
├── FlappyScene.vue
└── components/
    └── FlappyHUD.vue (Vue overlay)
```

### Key Features

- [ ] **Non-Elimination**: Nadie eliminado, solo puntos
- [ ] **Phaser 3.80**: Game engine completo
- [ ] **Classic Mechanics**: Tap/click to flap, avoid pipes
- [ ] **Score = Survival Time**: Tiempo sobrevivido / 100 = puntos
- [ ] **Crash Handling**: Al chocar, enviar score al servidor

### Store Structure

```typescript
interface FlappyState {
  isPlaying: boolean
  score: number
  highScore: number
  survivalTime: number
  gameOver: boolean
}
```

### Phaser Setup

```typescript
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'flappy-container',
  width: 800,
  height: 600,
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 1000 } },
  },
  scene: [MainScene],
}
```

### MainScene

- Bird sprite with physics
- Pipe obstacles (spawning at intervals)
- Collision detection
- Score tracking
- Background scrolling

### Vue HUD Overlay

- Display score
- Display time
- "Game Over" modal
- Restart button (supervisor only)

### WebSocket Events

- [x] `GameStarted` - Juego bonus iniciado
- [x] `GameEnded` - Jugador chocó
- [x] `ScoreSubmitted` - Score enviado a scoreboard

---

## 🔧 Shared Patterns Across Games

### Store Pattern

```typescript
export const use[Game]Store = defineStore('[game]', () => {
  const state = ref<GameState>(initialState)

  // Actions
  function reset() {
    state.value = { ...initialState }
  }

  return { state, reset, ...actions }
})
```

### WebSocket Pattern

```typescript
export function use[Game]WebSocket() {
  const store = use[Game]Store()
  const { channel } = useEcho()

  const gameChannel = channel(`game.[game]`)

  gameChannel.listen('EventName', (event) => {
    store.updateState(event)
  })

  onUnmounted(() => {
    // Cleanup
  })
}
```

### Scene Pattern

```vue
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { use[Game]Store } from './[game].store'
import { use[Game]WebSocket } from './[game].socket'
import { use[Game]Audio } from './[game].audio'

const store = use[Game]Store()
const { playTheme, stopTheme } = use[Game]Audio()

use[Game]WebSocket()

onMounted(() => {
  playTheme()
})

onUnmounted(() => {
  stopTheme()
  store.reset()
})
</script>

<template>
  <div class="[game]-scene">
    <!-- Game UI -->
  </div>
</template>
```

---

## 🎨 Three.js Integration (Rope & Spell)

### Setup

```bash
npm add three @tresjs/core @tresjs/cientos
npm add -D @types/three
```

### Component Pattern

```vue
<script setup lang="ts">
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'

// Visual logic
import { RopeVisual } from './rope.visual'

const visual = new RopeVisual()

onMounted(() => {
  visual.init()
})

onUnmounted(() => {
  visual.destroy()
})
</script>

<template>
  <TresCanvas>
    <TresPerspectiveCamera :position="[0, 5, 10]" />
    <TresAmbientLight :intensity="0.5" />
    <TresDirectionalLight :position="[5, 5, 5]" />
    <!-- 3D Objects -->
  </TresCanvas>
</template>
```

---

## ✅ Master Acceptance Criteria

### For Each Game

- [x] Store manages game state correctly
- [x] WebSocket events update store in real-time
- [x] UI reflects state changes
- [x] Audio plays on key events
- [x] Animations smooth and performant
- [x] Scene cleanup on unmount (no memory leaks)
- [x] Integration with scoreboard system
- [x] Elimination logic works (if applicable)

### Specific to Bonus Games

- [x] No elimination occurs
- [x] Scores submitted to scoreboard
- [x] Can be started by supervisor at any time
- [x] All players participate simultaneously

### Three.js Games (Rope & Spell)

- [x] Visual renders correctly
- [x] No memory leaks (proper cleanup)
- [x] Performance >30 FPS on average hardware
- [x] Syncs with WebSocket state

### Phaser Game (Flappy)

- [x] Game runs smoothly in Phaser canvas
- [x] Vue HUD overlays correctly
- [x] Score calculated from survival time
- [x] Clean destroy on unmount

---

## 🔗 Related Files

### Rope

- `src/modules/games/rope/rope.store.ts`
- `src/modules/games/rope/rope.visual.ts`
- `src/modules/games/rope/RopeScene.vue`

### Spell

- `src/modules/games/spell/spell.store.ts`
- `src/modules/games/spell/spell.visual.ts`
- `src/modules/games/spell/SpellScene.vue`

### Roulette

- `src/modules/games/roulette/roulette.store.ts`
- `src/modules/games/roulette/RouletteScene.vue`

### Word Search

- `src/modules/games/word-search/word-search.store.ts`
- `src/modules/games/word-search/WordSearchScene.vue`

### Flappy

- `src/modules/games/flappy/flappy.game.ts`
- `src/modules/games/flappy/FlappyScene.vue`

---

## 📚 References

- [Three.js Documentation](https://threejs.org/docs/)
- [TresJS Vue Integration](https://tresjs.org/)
- [Phaser 3 Documentation](https://photonstorm.github.io/phaser3-docs/)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
