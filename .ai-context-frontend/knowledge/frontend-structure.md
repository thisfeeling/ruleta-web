# Frontend Structure

## Estructura de Carpetas Completa

```
src/
├── app/
│   ├── App.vue                    # Componente raíz
│   ├── main.ts                    # Entry point
│   └── router/
│       └── index.ts               # Configuración rutas
│
├── assets/
│   ├── styles/
│   │   ├── base.css               # Estilos base
│   │   └── main.css               # Estilos principales
│   ├── images/                    # Imágenes estáticas
│   └── audio/                     # Audio assets
│       ├── ambience/              # Sonido ambiente
│       ├── music/                 # Música de fondo
│       └── voices/                # Voces pre-generadas
│
├── modules/                       # DOMINIOS GRANDES
│   ├── core/                      # 👈 Infraestructura base
│   │   ├── services/
│   │   │   ├── api.service.ts     # Cliente Axios configurado
│   │   │   ├── echo.service.ts    # 👈 Cliente Echo/Reverb
│   │   │   ├── audio.service.ts   # Reproducción audio
│   │   │   ├── elevenlabs.service.ts  # (NO USAR - solo ref)
│   │   │   └── storage.service.ts # LocalStorage wrapper
│   │   │
│   │   ├── stores/                # Stores globales
│   │   │   ├── auth.store.ts      # Autenticación
│   │   │   ├── session.store.ts   # Sesión actual
│   │   │   └── ui.store.ts        # Estado UI global
│   │   │
│   │   ├── composables/           # Composables reutilizables
│   │   │   ├── useAlert.ts        # Sistema de alertas
│   │   │   ├── useEcho.ts         # Wrapper Echo
│   │   │   ├── useAudio.ts        # Audio helpers
│   │   │   └── useIntensity.ts    # Cálculo intensidad
│   │   │
│   │   └── utils/                 # Utilidades puras
│   │       ├── math.ts            # Funciones matemáticas
│   │       └── time.ts            # Formateo tiempo
│   │
│   ├── game/                      # 👈 ORQUESTADOR GENERAL
│   │   ├── stores/
│   │   │   ├── game.store.ts      # Estado global del show
│   │   │   ├── players.store.ts   # Lista jugadores
│   │   │   └── round.store.ts     # Ronda actual
│   │   │
│   │   ├── engine/
│   │   │   ├── loop.ts            # Game loop (si aplica)
│   │   │   ├── state-machine.ts   # 👈 Máquina de estados
│   │   │   └── eliminations.ts    # Lógica visualización eliminaciones
│   │   │
│   │   ├── net/
│   │   │   ├── game.socket.ts     # Listeners WebSocket generales
│   │   │   └── game.events.ts     # Tipos de eventos
│   │   │
│   │   └── scenes/
│   │       ├── LobbyScene.vue     # Sala espera
│   │       ├── TransitionScene.vue # Entre juegos
│   │       └── WinnerScene.vue    # Pantalla ganador
│   │
│   ├── games/                     # 👈 CADA JUEGO ES UN MÓDULO
│   │   ├── millionaire/
│   │   │   ├── MillionaireScene.vue
│   │   │   ├── millionaire.store.ts
│   │   │   ├── millionaire.logic.ts
│   │   │   ├── millionaire.socket.ts
│   │   │   └── millionaire.audio.ts
│   │   │
│   │   ├── rope/
│   │   │   ├── RopeScene.vue
│   │   │   ├── rope.store.ts
│   │   │   ├── rope.logic.ts
│   │   │   ├── rope.socket.ts
│   │   │   └── rope.visual.ts      # 👈 Three.js aquí
│   │   │
│   │   ├── spell/
│   │   │   ├── SpellScene.vue
│   │   │   ├── spell.store.ts
│   │   │   ├── spell.logic.ts
│   │   │   ├── spell.socket.ts
│   │   │   └── spell.recorder.ts   # Audio recording
│   │   │
│   │   └── roulette/
│   │       ├── RouletteScene.vue
│   │       ├── roulette.store.ts
│   │       ├── roulette.logic.ts
│   │       └── roulette.socket.ts
│   │
│   ├── player/                    # Módulo jugador
│   │   ├── PlayerHUD.vue
│   │   ├── PlayerCard.vue
│   │   ├── PlayerList.vue
│   │   ├── ReconnectView.vue
│   │   └── player.store.ts
│   │
│   ├── supervisor/                # Módulo supervisor
│   │   ├── SupervisorDashboard.vue
│   │   ├── AudioReview.vue
│   │   ├── PlayerTimeline.vue
│   │   └── supervisor.store.ts
│   │
│   └── chat/                      # Chat en tiempo real
│       ├── ChatBox.vue            # 👈 Posición: bottom-left lateral
│       ├── ChatMessage.vue
│       ├── chat.store.ts
│       └── chat.socket.ts
│
├── ui/                            # 👈 UI PURA (componentes reutilizables)
│   ├── components/
│   │   ├── alerts/
│   │   │   ├── Alert.vue
│   │   │   └── AlertContainer.vue
│   │   ├── buttons/
│   │   │   ├── PrimaryButton.vue
│   │   │   └── IconButton.vue
│   │   │
│   │   ├── modals/
│   │   │   ├── BaseModal.vue
│   │   │   └── ConfirmModal.vue
│   │   │
│   │   ├── hud/
│   │   │   ├── ScoreDisplay.vue
│   │   │   ├── Timer.vue
│   │   │   ├── PlayerStatus.vue
│   │   │   └── VersionDisplay.vue
│   │   │
│   │   ├── forms/
│   │   │   ├── Input.vue
│   │   │   └── ColorPicker.vue
│   │   │
│   │   └── screens/
│   │       ├── PassedScreen.vue    # Pantalla "PASASTE"
│   │       └── EliminatedScreen.vue # Pantalla "ELIMINADO"
│   │
│   └── layouts/
│       ├── GameLayout.vue          # Layout juegos
│       └── DefaultLayout.vue       # Layout general
│
├── views/                         # 👈 VISTAS DE ROUTING
│   ├── HomeView.vue               # Landing/home
│   ├── LobbyView.vue              # Lobby principal
│   ├── GameView.vue               # Contenedor juego activo
│   └── SupervisorView.vue         # Panel supervisor
│
└── plugins/
    ├── axios.ts                   # Configuración Axios
    └── pinia.ts                   # Configuración Pinia
```

## Convenciones de Nomenclatura

### Archivos Vue

- **PascalCase**: `PlayerCard.vue`, `MillionaireScene.vue`
- **Prefijos**:
  - `Base`: Componentes base (`BaseModal.vue`)
  - `The`: Componentes únicos (`TheHeader.vue`)
  - Sin prefijo: Componentes específicos

### Archivos TypeScript

- **camelCase**: `game.store.ts`, `audio.service.ts`
- **Sufijos**:
  - `.store.ts`: Stores Pinia
  - `.service.ts`: Servicios
  - `.socket.ts`: Listeners WebSocket
  - `.logic.ts`: Lógica de negocio
  - `.visual.ts`: Three.js/rendering
  - `.types.ts`: Definiciones de tipos

### Carpetas

- **kebab-case**: `millionaire/`, `spell/`
- **Singular para módulos**: `player/`, `game/`
- **Plural para listas**: `components/`, `games/`

## Responsabilidades por Carpeta

### `/modules/core/`

**Propósito**: Infraestructura transversal, nada específico del juego.

**Contiene**:

- Servicios base (API, Echo, Audio)
- Stores globales (Auth, UI)
- Composables reutilizables
- Utilidades puras

**NO contiene**:

- Componentes Vue
- Lógica de juegos específicos
- WebSocket listeners específicos

### `/modules/game/`

**Propósito**: Orquestación del show completo.

**Contiene**:

- State machine (lobby → juegos → winner)
- Stores del estado global del show
- Listeners WebSocket generales
- Escenas de transición

**NO contiene**:

- Lógica de juegos individuales
- Componentes de juegos específicos

### `/modules/games/`

**Propósito**: Cada juego es un módulo aislado.

**Estructura por juego**:

```
millionaire/
├── MillionaireScene.vue      # Componente principal
├── millionaire.store.ts      # Estado del juego
├── millionaire.logic.ts      # Lógica específica
├── millionaire.socket.ts     # Listeners WebSocket
└── millionaire.audio.ts      # Audio específico
```

**Aislamiento**: Un juego no importa de otro juego.

### `/modules/player/` y `/modules/supervisor/`

**Propósito**: Módulos por rol.

- `player/`: Todo lo relacionado con jugadores
- `supervisor/`: Dashboard y herramientas supervisor

### `/ui/components/`

**Propósito**: Componentes reutilizables sin lógica de negocio.

**Características**:

- Reciben props
- Emiten eventos
- No conocen Pinia stores
- No conocen rutas
- Estilados con Tailwind + DaisyUI

### `/views/`

**Propósito**: Componentes de página (routing).

**Características**:

- Conectados a Vue Router
- Componen módulos
- NO contienen lógica compleja

## Patrones de Importación

### Imports Absolutos (preferido)

```typescript
import { useGameStore } from '@/modules/game/stores/game.store'
import { echoService } from '@/modules/core/services/echo.service'
import PrimaryButton from '@/ui/components/buttons/PrimaryButton.vue'
```

**Configuración en `vite.config.ts`**:

```typescript
resolve: {
  alias: {
    '@': '/src'
  }
}
```

### Imports Relativos (evitar)

```typescript
// ❌ Evitar
import { useGameStore } from '../../../game/stores/game.store'
```

## Flujo de Datos

### Estado Global (Pinia)

```
game.store.ts
  ├─ currentGame: 'millionaire' | 'rope' | ...
  ├─ phase: 'lobby' | 'playing' | 'winner'
  └─ players: Player[]

players.store.ts
  └─ players: Map<id, Player>

millionaire.store.ts (específico)
  ├─ currentQuestion: Question
  ├─ answers: Answer[]
  └─ countdown: number
```

### Comunicación entre Módulos

**✅ A través de stores**:

```typescript
// game.socket.ts
echo.listen('GameChanged', (e) => {
  gameStore.setCurrentGame(e.game)
})

// MillionaireScene.vue
const gameStore = useGameStore()
watch(
  () => gameStore.currentGame,
  (game) => {
    if (game !== 'millionaire') router.push('/lobby')
  },
)
```

**❌ NO directamente**:

```typescript
// ❌ Evitar
import { millionaireStore } from '@/modules/games/millionaire/millionaire.store'
```

## Composables Pattern

### Ejemplo: `useEcho.ts`

```typescript
// modules/core/composables/useEcho.ts
import { echoService } from '@/modules/core/services/echo.service'

export function useGameChannel(roomId: string) {
  const channel = echoService.private(`game.${roomId}`)

  onUnmounted(() => {
    channel.stopListening()
  })

  return { channel }
}
```

**Uso**:

```vue
<script setup lang="ts">
import { useGameChannel } from '@/modules/core/composables/useEcho'

const { channel } = useGameChannel('room-1')

channel.listen('PlayerJoined', (e) => {
  console.log(e.player)
})
</script>
```

## Services Pattern

### Singleton Services

```typescript
// modules/core/services/echo.service.ts
import Echo from 'laravel-echo'

class EchoService {
  private echo: Echo

  constructor() {
    this.echo = new Echo({
      broadcaster: 'reverb',
      key: import.meta.env.VITE_REVERB_APP_KEY,
      wsHost: import.meta.env.VITE_REVERB_HOST,
      wsPort: 443,
      forceTLS: true,
    })
  }

  public private(channel: string) {
    return this.echo.private(channel)
  }
}

export const echoService = new EchoService()
```

## Reglas de Dependencias

```
views/
  ↓ puede usar
modules/
  ↓ puede usar
ui/components/
  ↓ NO puede usar nada (solo props/emit)
```

**Nunca**:

- `ui/` no importa de `modules/`
- `modules/games/millionaire/` no importa de `modules/games/rope/`
- `core/` no importa de `game/` ni `games/`

## Ejemplo Completo: Millionaire

```
modules/games/millionaire/
│
├── MillionaireScene.vue
│   ├─ Importa: millionaire.store.ts
│   ├─ Importa: ui/components/
│   └─ Usa: useMillionaireSocket()
│
├── millionaire.store.ts
│   └─ Estado: question, answers, countdown
│
├── millionaire.logic.ts
│   └─ checkAnswer(answer): boolean
│
├── millionaire.socket.ts
│   └─ useMillionaireSocket()
│       ├─ .listen('QuestionReceived')
│       └─ .listen('AnswerResult')
│
└── millionaire.audio.ts
    └─ playQuestionAudio()
    └─ playCorrectSound()
```

## TypeScript Conventions

### Interfaces

```typescript
// game.types.ts
export interface Player {
  id: number
  nickname: string
  color: string
  number: number
  status: 'alive' | 'eliminated'
  role: 'player' | 'supervisor'
}

export interface GameState {
  phase: GamePhase
  currentGame: GameType | null
  players: Player[]
}
```

### Enums

```typescript
export enum GamePhase {
  LOBBY = 'lobby',
  PLAYING = 'playing',
  TRANSITION = 'transition',
  WINNER = 'winner',
}
```

## Resumen de Decisiones

| Aspecto   | Decisión                   | Razón         |
| --------- | -------------------------- | ------------- |
| Módulos   | Por dominio/feature        | Escalabilidad |
| Stores    | Pinia (no Vuex)            | Vue 3 oficial |
| Imports   | Absolutos con @            | Claridad      |
| Services  | Singletons exportados      | Consistencia  |
| Three.js  | Solo en `rope.visual.ts`   | Aislamiento   |
| WebSocket | Un `.socket.ts` por módulo | Organización  |
| Tipos     | En `.types.ts` separado    | Reutilización |
