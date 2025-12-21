# Sistema de Instrucciones

## Descripción General

Sistema de instrucciones pre-juego que presenta las reglas y mecánicas de cada mini-juego antes de comenzar la partida. El sistema incluye un modal con navegación paso a paso, capacidad de saltar para jugadores recurrentes, y controles de supervisión.

**Características:**

- Modal de instrucciones paso a paso antes de cada juego
- Navegación entre slides (anterior/siguiente)
- Opción "No mostrar de nuevo" con localStorage
- Supervisores pueden forzar mostrar instrucciones
- Instrucciones específicas por tipo de juego
- Soporte de multimedia (imágenes, GIFs, videos)
- Eventos auditados (InstructionsShown, InstructionsCompleted, InstructionsSkipped)

---

## Arquitectura de Componentes

```
InstructionsSystem
├── GameInstructions.vue          ← Modal principal con slides
├── InstructionSlide.vue          ← Slide individual con contenido
├── InstructionControls.vue       ← Navegación + opciones
└── instructions.store.ts         ← Estado Pinia
```

**Flujo de visualización:**

1. Supervisor inicia ronda → Backend valida metadata
2. Frontend verifica localStorage (skipInstructions[gameType])
3. Si no existe skip → Muestra modal con instrucciones
4. Usuario navega slides → Completa o salta
5. Backend audita evento (InstructionsCompleted / InstructionsSkipped)

---

## Componente Principal: GameInstructions.vue

**Ubicación:** `src/modules/game/scenes/GameInstructions.vue`

### Características

- Modal centrado con overlay
- Navegación entre slides con botones y teclado (←/→)
- Indicador de progreso (dots/pagination)
- Botón "Entendido" en último slide
- Checkbox "No mostrar de nuevo" (último slide)
- Supervisores pueden forzar mostrar (ignora localStorage)
- Animaciones de transición entre slides (slide-in)

### Template

```vue
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="instructionsStore.isVisible"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        @click.self="handleOverlayClick"
      >
        <!-- Modal Container -->
        <div class="w-full max-w-4xl mx-4 bg-base-100 rounded-2xl shadow-2xl overflow-hidden">
          <!-- Header -->
          <div class="flex items-center justify-between p-6 border-b border-base-300">
            <div>
              <h2 class="text-3xl font-bold text-primary">
                {{ $t(`games.${instructionsStore.gameType}.title`) }}
              </h2>
              <p class="text-sm text-base-content/60 mt-1">
                {{ $t('instructions.subtitle') }}
              </p>
            </div>

            <div class="flex items-center gap-2">
              <!-- Progress Indicator -->
              <span class="text-sm font-medium text-base-content/60">
                {{ currentSlide + 1 }} / {{ instructionsStore.slides.length }}
              </span>

              <!-- Close button (only if not forced) -->
              <button
                v-if="!instructionsStore.forcedBySuper"
                class="btn btn-sm btn-ghost btn-circle"
                @click="handleSkip"
              >
                <Icon name="mdi:close" class="w-5 h-5" />
              </button>
            </div>
          </div>

          <!-- Slide Content -->
          <div class="relative min-h-400px p-8">
            <TransitionGroup name="slide" mode="out-in">
              <InstructionSlide
                v-for="(slide, index) in instructionsStore.slides"
                v-show="index === currentSlide"
                :key="`slide-${index}`"
                :slide="slide"
                :index="index"
                :total="instructionsStore.slides.length"
              />
            </TransitionGroup>
          </div>

          <!-- Footer Controls -->
          <div class="flex items-center justify-between p-6 border-t border-base-300">
            <!-- Checkbox "No mostrar de nuevo" (only last slide) -->
            <label
              v-if="
                currentSlide === instructionsStore.slides.length - 1 &&
                !instructionsStore.forcedBySuper
              "
              class="flex items-center gap-2 cursor-pointer"
            >
              <input
                v-model="skipFuture"
                type="checkbox"
                class="checkbox checkbox-sm checkbox-primary"
              />
              <span class="text-sm text-base-content/80">
                {{ $t('instructions.skipFuture') }}
              </span>
            </label>
            <div v-else></div>

            <!-- Navigation Buttons -->
            <div class="flex items-center gap-3">
              <button v-if="currentSlide > 0" class="btn btn-ghost" @click="previousSlide">
                <Icon name="mdi:chevron-left" class="w-5 h-5" />
                {{ $t('instructions.previous') }}
              </button>

              <button
                v-if="currentSlide < instructionsStore.slides.length - 1"
                class="btn btn-primary"
                @click="nextSlide"
              >
                {{ $t('instructions.next') }}
                <Icon name="mdi:chevron-right" class="w-5 h-5" />
              </button>

              <button v-else class="btn btn-primary" @click="handleComplete">
                {{ $t('instructions.understood') }}
                <Icon name="mdi:check-circle" class="w-5 h-5" />
              </button>
            </div>
          </div>

          <!-- Pagination Dots -->
          <div class="flex justify-center gap-2 pb-4">
            <button
              v-for="(_, index) in instructionsStore.slides"
              :key="`dot-${index}`"
              class="w-2 h-2 rounded-full transition-all"
              :class="index === currentSlide ? 'bg-primary w-8' : 'bg-base-300'"
              @click="currentSlide = index"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useInstructionsStore } from '@/modules/game/stores/instructions.store'
import { useI18n } from 'vue-i18n'
import InstructionSlide from './InstructionSlide.vue'
import { storageService } from '@/modules/core/services/storage.service'

const { t } = useI18n()
const instructionsStore = useInstructionsStore()

const currentSlide = ref(0)
const skipFuture = ref(false)

// Reset slide when instructions shown
watch(
  () => instructionsStore.isVisible,
  (visible) => {
    if (visible) {
      currentSlide.value = 0
      skipFuture.value = false
    }
  },
)

// Navigation
function nextSlide() {
  if (currentSlide.value < instructionsStore.slides.length - 1) {
    currentSlide.value++
  }
}

function previousSlide() {
  if (currentSlide.value > 0) {
    currentSlide.value--
  }
}

// Keyboard navigation
function handleKeydown(event: KeyboardEvent) {
  if (!instructionsStore.isVisible) return

  if (event.key === 'ArrowRight') {
    nextSlide()
  } else if (event.key === 'ArrowLeft') {
    previousSlide()
  } else if (event.key === 'Escape' && !instructionsStore.forcedBySuper) {
    handleSkip()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})

// Complete instructions
function handleComplete() {
  if (skipFuture.value) {
    storageService.set(`skipInstructions:${instructionsStore.gameType}`, true)
  }

  instructionsStore.complete()
}

// Skip instructions
function handleSkip() {
  if (instructionsStore.forcedBySuper) return

  instructionsStore.skip()
}

// Overlay click (close if not forced)
function handleOverlayClick() {
  if (!instructionsStore.forcedBySuper) {
    handleSkip()
  }
}
</script>

<style scoped>
/* Fade transition for modal */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Slide transition for content */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.4s ease;
}

.slide-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}
</style>
```

---

## Componente Slide: InstructionSlide.vue

**Ubicación:** `src/modules/game/scenes/InstructionSlide.vue`

### Template

```vue
<template>
  <div class="flex flex-col gap-6">
    <!-- Media (image/gif/video) -->
    <div v-if="slide.media" class="flex justify-center">
      <img
        v-if="slide.media.type === 'image' || slide.media.type === 'gif'"
        :src="slide.media.url"
        :alt="slide.title"
        class="max-w-full max-h-64 rounded-lg shadow-lg"
      />

      <video
        v-else-if="slide.media.type === 'video'"
        :src="slide.media.url"
        class="max-w-full max-h-64 rounded-lg shadow-lg"
        autoplay
        loop
        muted
      />
    </div>

    <!-- Title -->
    <h3 class="text-2xl font-bold text-center text-primary">
      {{ $t(slide.title) }}
    </h3>

    <!-- Description -->
    <div class="prose prose-lg max-w-none text-center">
      <p v-html="$t(slide.description)"></p>
    </div>

    <!-- List items (if any) -->
    <ul
      v-if="slide.items && slide.items.length > 0"
      class="list-disc list-inside space-y-2 text-base-content/80"
    >
      <li v-for="(item, i) in slide.items" :key="i">
        {{ $t(item) }}
      </li>
    </ul>

    <!-- Tips (if any) -->
    <div v-if="slide.tip" class="alert alert-info">
      <Icon name="mdi:lightbulb-on" class="w-6 h-6" />
      <span>{{ $t(slide.tip) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { InstructionSlide } from '@/types/instructions.types'

interface Props {
  slide: InstructionSlide
  index: number
  total: number
}

defineProps<Props>()
</script>
```

---

## Store: instructions.store.ts

**Ubicación:** `src/modules/game/stores/instructions.store.ts`

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { InstructionSlide, GameType } from '@/types/instructions.types'
import { storageService } from '@/modules/core/services/storage.service'
import { apiService } from '@/modules/core/services/api.service'

export const useInstructionsStore = defineStore('instructions', () => {
  // State
  const isVisible = ref(false)
  const gameType = ref<GameType | null>(null)
  const slides = ref<InstructionSlide[]>([])
  const forcedBySuper = ref(false) // Supervisor forzó mostrar

  // Getters
  const shouldShow = computed(() => {
    if (!gameType.value) return false
    if (forcedBySuper.value) return true // Supervisor fuerza

    // Check localStorage skip preference
    const skipKey = `skipInstructions:${gameType.value}`
    return !storageService.get(skipKey, false)
  })

  // Actions
  function show(type: GameType, instructionSlides: InstructionSlide[], forced = false) {
    gameType.value = type
    slides.value = instructionSlides
    forcedBySuper.value = forced
    isVisible.value = true

    // Audit event
    apiService.post('/api/audit/instructions-shown', {
      gameType: type,
      forced,
      timestamp: Date.now(),
    })
  }

  function complete() {
    isVisible.value = false

    // Audit event
    apiService.post('/api/audit/instructions-completed', {
      gameType: gameType.value,
      timestamp: Date.now(),
    })

    // Clear state
    gameType.value = null
    slides.value = []
    forcedBySuper.value = false
  }

  function skip() {
    isVisible.value = false

    // Audit event
    apiService.post('/api/audit/instructions-skipped', {
      gameType: gameType.value,
      timestamp: Date.now(),
    })

    // Clear state
    gameType.value = null
    slides.value = []
    forcedBySuper.value = false
  }

  function reset() {
    isVisible.value = false
    gameType.value = null
    slides.value = []
    forcedBySuper.value = false
  }

  return {
    // State
    isVisible,
    gameType,
    slides,
    forcedBySuper,

    // Getters
    shouldShow,

    // Actions
    show,
    complete,
    skip,
    reset,
  }
})
```

---

## Tipos TypeScript

**Ubicación:** `src/types/instructions.types.ts`

```typescript
export type GameType = 'millionaire' | 'rope' | 'spell' | 'roulette' | 'word-search' | 'flappy'

export interface InstructionSlide {
  title: string // i18n key
  description: string // i18n key (puede tener HTML)
  items?: string[] // Lista de puntos (i18n keys)
  tip?: string // Consejo opcional (i18n key)
  media?: {
    type: 'image' | 'gif' | 'video'
    url: string // URL relativa o absoluta
  }
}

export interface InstructionsMetadata {
  gameType: GameType
  slides: InstructionSlide[]
  version: string // Para invalidar cache cuando cambian instrucciones
}
```

---

## Metadata de Instrucciones por Juego

### Millionaire

```typescript
const millionaireInstructions: InstructionSlide[] = [
  {
    title: 'games.millionaire.instructions.slide1.title',
    description: 'games.millionaire.instructions.slide1.description',
    media: {
      type: 'image',
      url: '/images/instructions/millionaire-intro.jpg',
    },
  },
  {
    title: 'games.millionaire.instructions.slide2.title',
    description: 'games.millionaire.instructions.slide2.description',
    items: [
      'games.millionaire.instructions.slide2.item1', // "Responde 10 preguntas en 3 minutos"
      'games.millionaire.instructions.slide2.item2', // "Cada respuesta suma puntos"
      'games.millionaire.instructions.slide2.item3', // "Los más bajos quedan eliminados"
    ],
    media: {
      type: 'gif',
      url: '/images/instructions/millionaire-gameplay.gif',
    },
  },
  {
    title: 'games.millionaire.instructions.slide3.title',
    description: 'games.millionaire.instructions.slide3.description',
    items: [
      'games.millionaire.instructions.slide3.item1', // "50:50 - Elimina dos opciones incorrectas"
      'games.millionaire.instructions.slide3.item2', // "Máximo 4 usos por partida"
    ],
    tip: 'games.millionaire.instructions.slide3.tip',
    media: {
      type: 'image',
      url: '/images/instructions/millionaire-joker.png',
    },
  },
]
```

### Rope

```typescript
const ropeInstructions: InstructionSlide[] = [
  {
    title: 'games.rope.instructions.slide1.title',
    description: 'games.rope.instructions.slide1.description',
    media: {
      type: 'video',
      url: '/videos/instructions/rope-intro.mp4',
    },
  },
  {
    title: 'games.rope.instructions.slide2.title',
    description: 'games.rope.instructions.slide2.description',
    items: [
      'games.rope.instructions.slide2.item1', // "Forman equipos de 5 jugadores"
      'games.rope.instructions.slide2.item2', // "Votan nombre del equipo"
      'games.rope.instructions.slide2.item3', // "Compiten en enfrentamientos 1v1"
    ],
    media: {
      type: 'gif',
      url: '/images/instructions/rope-teams.gif',
    },
  },
  {
    title: 'games.rope.instructions.slide3.title',
    description: 'games.rope.instructions.slide3.description',
    tip: 'games.rope.instructions.slide3.tip',
    media: {
      type: 'gif',
      url: '/images/instructions/rope-battle.gif',
    },
  },
]
```

### Spell

```typescript
const spellInstructions: InstructionSlide[] = [
  {
    title: 'games.spell.instructions.slide1.title',
    description: 'games.spell.instructions.slide1.description',
    media: {
      type: 'image',
      url: '/images/instructions/spell-intro.jpg',
    },
  },
  {
    title: 'games.spell.instructions.slide2.title',
    description: 'games.spell.instructions.slide2.description',
    items: [
      'games.spell.instructions.slide2.item1', // "Mira la palabra durante 5 segundos"
      'games.spell.instructions.slide2.item2', // "Escribe letra por letra"
      'games.spell.instructions.slide2.item3', // "Sin corrector, sin borrar"
    ],
    media: {
      type: 'video',
      url: '/videos/instructions/spell-gameplay.mp4',
    },
  },
  {
    title: 'games.spell.instructions.slide3.title',
    description: 'games.spell.instructions.slide3.description',
    tip: 'games.spell.instructions.slide3.tip',
    media: {
      type: 'gif',
      url: '/images/instructions/spell-bomb.gif',
    },
  },
]
```

### Roulette

```typescript
const rouletteInstructions: InstructionSlide[] = [
  {
    title: 'games.roulette.instructions.slide1.title',
    description: 'games.roulette.instructions.slide1.description',
    media: {
      type: 'image',
      url: '/images/instructions/roulette-intro.jpg',
    },
  },
  {
    title: 'games.roulette.instructions.slide2.title',
    description: 'games.roulette.instructions.slide2.description',
    items: [
      'games.roulette.instructions.slide2.item1', // "Responde preguntas de categoría aleatoria"
      'games.roulette.instructions.slide2.item2', // "Cada ronda nueva categoría"
      'games.roulette.instructions.slide2.item3', // "Los lentos quedan eliminados"
    ],
    media: {
      type: 'gif',
      url: '/images/instructions/roulette-spin.gif',
    },
  },
]
```

### Word Search

```typescript
const wordSearchInstructions: InstructionSlide[] = [
  {
    title: 'games.wordSearch.instructions.slide1.title',
    description: 'games.wordSearch.instructions.slide1.description',
    media: {
      type: 'image',
      url: '/images/instructions/word-search-intro.jpg',
    },
  },
  {
    title: 'games.wordSearch.instructions.slide2.title',
    description: 'games.wordSearch.instructions.slide2.description',
    items: [
      'games.wordSearch.instructions.slide2.item1', // "Encuentra 12 palabras en la sopa"
      'games.wordSearch.instructions.slide2.item2', // "Arrastra para seleccionar"
      'games.wordSearch.instructions.slide2.item3', // "Los más rápidos suman más puntos"
    ],
    tip: 'games.wordSearch.instructions.slide2.tip',
    media: {
      type: 'gif',
      url: '/images/instructions/word-search-gameplay.gif',
    },
  },
]
```

### Flappy

```typescript
const flappyInstructions: InstructionSlide[] = [
  {
    title: 'games.flappy.instructions.slide1.title',
    description: 'games.flappy.instructions.slide1.description',
    media: {
      type: 'image',
      url: '/images/instructions/flappy-intro.jpg',
    },
  },
  {
    title: 'games.flappy.instructions.slide2.title',
    description: 'games.flappy.instructions.slide2.description',
    items: [
      'games.flappy.instructions.slide2.item1', // "Presiona ESPACIO para volar"
      'games.flappy.instructions.slide2.item2', // "Evita los obstáculos"
      'games.flappy.instructions.slide2.item3', // "Acumula puntos por sobrevivir"
    ],
    tip: 'games.flappy.instructions.slide2.tip',
    media: {
      type: 'video',
      url: '/videos/instructions/flappy-gameplay.mp4',
    },
  },
]
```

---

## Backend: Metadata en Rounds

**Ubicación:** `app/Models/Round.php`

### Agregar campo `metadata` a tabla rounds

```php
Schema::table('rounds', function (Blueprint $table) {
    $table->json('metadata')->nullable(); // Almacena instructions + otros configs
});
```

### Estructura metadata

```json
{
  "instructions": {
    "version": "1.0.0",
    "lastUpdated": "2024-01-15T10:30:00Z"
  },
  "settings": {
    "duration": 180,
    "eliminationRate": 0.4
  }
}
```

### Action: ShowInstructions.php

**Ubicación:** `app/Actions/Game/ShowInstructions.php`

```php
<?php

namespace App\Actions\Game;

use App\Models\Round;
use App\Models\Player;
use App\Events\InstructionsRequired;

class ShowInstructions
{
    public function execute(Round $round, bool $forced = false): void
    {
        // Get game type from round
        $gameType = $round->game_type;

        // Load instructions metadata
        $instructions = $this->loadInstructions($gameType);

        // Broadcast to all players
        broadcast(new InstructionsRequired(
            sessionId: $round->session_id,
            gameType: $gameType,
            slides: $instructions['slides'],
            forced: $forced,
            version: $instructions['version']
        ));

        // Audit event
        app(AuditService::class)->log(
            type: 'game',
            action: 'instructions_shown',
            userId: auth()->id(),
            metadata: [
                'session_id' => $round->session_id,
                'round_id' => $round->id,
                'game_type' => $gameType,
                'forced' => $forced,
            ]
        );
    }

    private function loadInstructions(string $gameType): array
    {
        // Load from config or database
        return config("instructions.{$gameType}");
    }
}
```

---

## Controles de Supervisor

**Ubicación:** `src/modules/supervisor/SupervisorDashboard.vue` (agregar sección)

### Template Fragment

```vue
<div class="card bg-base-200 shadow-lg">
  <div class="card-body">
    <h3 class="card-title">
      <Icon name="mdi:information-outline" class="w-6 h-6" />
      Instrucciones
    </h3>

    <div class="flex items-center justify-between">
      <p class="text-sm text-base-content/60">
        Forzar mostrar instrucciones a todos los jugadores
      </p>

      <button
        class="btn btn-sm btn-primary"
        :disabled="!canForceInstructions"
        @click="forceShowInstructions"
      >
        <Icon name="mdi:play-circle" class="w-4 h-4" />
        Mostrar Instrucciones
      </button>
    </div>

    <div class="alert alert-info mt-2">
      <Icon name="mdi:information" class="w-5 h-5" />
      <span class="text-xs">
        Las instrucciones se muestran automáticamente antes de cada juego.
        Usa este botón solo si necesitas repetirlas.
      </span>
    </div>
  </div>
</div>
```

### Script Fragment

```typescript
import { apiService } from '@/modules/core/services/api.service'
import { useGameStore } from '@/modules/game/stores/game.store'

const gameStore = useGameStore()

const canForceInstructions = computed(() => {
  return gameStore.currentRound && gameStore.currentRound.status !== 'completed'
})

async function forceShowInstructions() {
  try {
    await apiService.post('/api/supervisor/force-instructions', {
      sessionId: gameStore.session?.id,
      roundId: gameStore.currentRound?.id,
    })

    // Success feedback
    useAlert().show({
      variant: 'success',
      message: 'Instrucciones enviadas a todos los jugadores',
    })
  } catch (error) {
    useAlert().show({
      variant: 'error',
      message: 'Error al enviar instrucciones',
    })
  }
}
```

---

## WebSocket Events

### Event: InstructionsRequired

**Channel:** `session.{sessionId}`

**Payload:**

```typescript
interface InstructionsRequiredPayload {
  sessionId: string
  gameType: GameType
  slides: InstructionSlide[]
  forced: boolean
  version: string
  timestamp: number
}
```

**Handler (Frontend):**

```typescript
// game.socket.ts
echo
  .private(`session.${sessionId}`)
  .listen('.InstructionsRequired', (payload: InstructionsRequiredPayload) => {
    const instructionsStore = useInstructionsStore()

    instructionsStore.show(payload.gameType, payload.slides, payload.forced)
  })
```

### Event: InstructionsCompleted

**Channel:** `session.{sessionId}` (broadcast)

**Payload:**

```typescript
interface InstructionsCompletedPayload {
  playerId: string
  playerName: string
  timestamp: number
}
```

---

## Integración con Game Loop

**Ubicación:** `src/modules/game/engine/loop.ts`

### Modificar función `startRound`

```typescript
async function startRound(round: Round) {
  const gameStore = useGameStore()
  const instructionsStore = useInstructionsStore()

  // Check if instructions should be shown
  if (instructionsStore.shouldShow) {
    // Load instructions metadata for this game type
    const instructions = await apiService.get<InstructionsMetadata>(
      `/api/rounds/${round.id}/instructions`,
    )

    // Show instructions modal
    instructionsStore.show(instructions.gameType, instructions.slides)

    // Wait for completion (or skip)
    await new Promise<void>((resolve) => {
      const unwatch = watch(
        () => instructionsStore.isVisible,
        (visible) => {
          if (!visible) {
            unwatch()
            resolve()
          }
        },
      )
    })
  }

  // Proceed with game start
  gameStore.setStatus('playing')
  // ... rest of game logic
}
```

---

## LocalStorage Schema

**Key:** `skipInstructions:{gameType}`

**Value:** `boolean`

**Ejemplo:**

```javascript
localStorage.setItem('skipInstructions:millionaire', 'true')
localStorage.setItem('skipInstructions:rope', 'false')
```

**Invalidación:** Si cambia la versión de instrucciones, el backend puede emitir evento `InvalidateInstructionsCache` para forzar mostrar de nuevo.

---

## Audit Events

### InstructionsShown

```json
{
  "type": "game",
  "action": "instructions_shown",
  "user_id": "supervisor-123",
  "metadata": {
    "session_id": "sess-abc",
    "round_id": "round-001",
    "game_type": "millionaire",
    "forced": false,
    "version": "1.0.0"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### InstructionsCompleted

```json
{
  "type": "player",
  "action": "instructions_completed",
  "user_id": "player-456",
  "metadata": {
    "session_id": "sess-abc",
    "round_id": "round-001",
    "game_type": "millionaire",
    "duration_ms": 45000
  },
  "timestamp": "2024-01-15T10:30:45Z"
}
```

### InstructionsSkipped

```json
{
  "type": "player",
  "action": "instructions_skipped",
  "user_id": "player-789",
  "metadata": {
    "session_id": "sess-abc",
    "round_id": "round-001",
    "game_type": "millionaire",
    "reason": "user_preference"
  },
  "timestamp": "2024-01-15T10:30:10Z"
}
```

---

## Estructura de Archivos

```
src/modules/game/scenes/
├── GameInstructions.vue          ← Modal principal
├── InstructionSlide.vue          ← Slide individual
└── InstructionControls.vue       ← (opcional) Navegación

src/modules/game/stores/
└── instructions.store.ts         ← Estado Pinia

src/types/
└── instructions.types.ts         ← Tipos TypeScript

public/images/instructions/       ← Assets de instrucciones
├── millionaire-intro.jpg
├── millionaire-gameplay.gif
├── rope-intro.mp4
└── ...

config/instructions.php            ← Backend metadata config
app/Actions/Game/
└── ShowInstructions.php          ← Action Laravel

app/Events/
└── InstructionsRequired.php      ← WebSocket event
```

---

## Casos de Uso

### 1. Primera vez jugando Millionaire

1. Usuario entra a sesión → Selecciona juego Millionaire
2. Supervisor inicia ronda → Backend emite `InstructionsRequired`
3. Frontend verifica localStorage → No existe `skipInstructions:millionaire`
4. Muestra modal con 3 slides de instrucciones
5. Usuario navega y marca "No mostrar de nuevo" → Completa
6. localStorage guarda preferencia → Próxima vez se salta

### 2. Supervisor fuerza instrucciones

1. Jugadores veteranos están en lobby
2. Supervisor presiona botón "Mostrar Instrucciones"
3. Backend emite `InstructionsRequired` con `forced: true`
4. Frontend ignora localStorage y muestra modal
5. No aparece checkbox "No mostrar de nuevo"
6. Jugadores deben completar para continuar

### 3. Nueva versión de instrucciones

1. Backend actualiza metadata con `version: "2.0.0"`
2. Frontend detecta versión diferente a localStorage
3. Invalida cache y muestra instrucciones de nuevo
4. Usuario ve cambios y actualiza su conocimiento

---

## Consideraciones de UX

1. **Animaciones suaves:** Transiciones slide-in para cambio de slides
2. **Responsive:** Modal adaptable a móviles (stack vertical)
3. **Accesibilidad:** Navegación por teclado (flechas), ARIA labels
4. **Feedback visual:** Indicador de progreso (dots), número de slide
5. **Escape hatch:** Botón de cerrar o saltar (excepto si forzado)
6. **Multimedia:** Soporte para GIFs animados, videos cortos (< 30s)
7. **i18n ready:** Todos los textos con claves de traducción

---

## Mejoras Futuras

- **Analytics:** Tracking de slides completados vs saltados
- **AB Testing:** Diferentes estilos de instrucciones (video vs texto)
- **Gamificación:** Achievement por completar todas las instrucciones
- **Tutorial interactivo:** Modo práctica antes del juego real
- **Voice-over:** Narración de voz con ElevenLabs TTS (colombiano)
- **Modo cine:** Auto-play de slides con timer

---

## Dependencias

- **Pinia:** Estado global del sistema de instrucciones
- **vue-i18n:** Traducción de todos los textos
- **Storage Service:** Persistencia de preferencias skip
- **API Service:** Comunicación con backend Laravel
- **Echo (Reverb):** WebSocket events
- **Audit System:** Logging de eventos de instrucciones
