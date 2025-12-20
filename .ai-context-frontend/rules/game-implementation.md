# Game Rules & Implementation Guide

## State Machine del Show

### Flujo Completo

```
LOBBY
  ↓ (todos entran, se asignan números)
INTRO
  ↓ (audio bienvenida, explicación)
MILLIONAIRE (1)
  ↓ (eliminación ~40-50%)
SPELL (1)
  ↓ (eliminación individual)
ROPE
  ↓ (eliminación grupal)
MILLIONAIRE (2)
  ↓ (eliminación ~40-50%)
SPELL (2)
  ↓ (eliminación individual)
ROULETTE (FINAL)
  ↓ (solo 1 ganador)
WINNER
```

### Enum en Backend

```php
// app/Domain/Show/ShowPhase.php
enum ShowPhase: string
{
    case LOBBY = 'lobby';
    case INTRO = 'intro';
    case MILLIONAIRE = 'millionaire';
    case SPELL = 'spell';
    case ROPE = 'rope';
    case ROULETTE = 'roulette';
    case WINNER = 'winner';

    // Bonus games (optional, supervisor-triggered)
    case BONUS_WORD_SEARCH = 'bonus_word_search';
    case BONUS_FLAPPY = 'bonus_flappy';
}
```

### Bonus Games (Opcionales)

Los juegos bonus NO forman parte del flujo principal. Son activados manualmente por el Supervisor entre juegos principales:

```
MAIN FLOW              BONUS (optional, anytime)
=========              ==========================
LOBBY
  ↓                         ↓ (supervisor triggers)
MILLIONAIRE  ←─────  WORD_SEARCH / FLAPPY
  ↓                         ↓ (ends, returns to main flow)
SPELL
  ↓
...
```

**Características**:

- ❌ NO eliminatorios
- ✅ Todos participan
- ✅ Generan puntos en scoreboard
- ✅ Activación manual (supervisor)
- ✅ Pueden ocurrir entre cualquier juego principal

### State Machine

```php
// app/Domain/Show/ShowMachine.php
class ShowMachine
{
    private ShowPhase $currentPhase = ShowPhase::LOBBY;
    private int $millionaireCount = 0;
    private int $spellCount = 0;

    public function next(): ShowPhase
    {
        $this->currentPhase = match($this->currentPhase) {
            ShowPhase::LOBBY => ShowPhase::INTRO,
            ShowPhase::INTRO => ShowPhase::MILLIONAIRE,

            ShowPhase::MILLIONAIRE => $this->afterMillionaire(),
            ShowPhase::SPELL => $this->afterSpell(),
            ShowPhase::ROPE => ShowPhase::MILLIONAIRE,
            ShowPhase::ROULETTE => ShowPhase::WINNER,
            ShowPhase::WINNER => ShowPhase::WINNER, // Terminal
        };

        event(new GameStarted($this->currentPhase));

        return $this->currentPhase;
    }

    private function afterMillionaire(): ShowPhase
    {
        $this->millionaireCount++;

        if ($this->millionaireCount === 1) {
            return ShowPhase::SPELL;
        } else {
            // Segunda ronda de Millonario
            return ShowPhase::SPELL;
        }
    }

    private function afterSpell(): ShowPhase
    {
        $this->spellCount++;

        if ($this->spellCount === 1) {
            return ShowPhase::ROPE;
        } else {
            // Segunda ronda de Spell, ir a final
            return ShowPhase::ROULETTE;
        }
    }
}
```

---

## Juego del Millonario

### Mecánica

**Tipo**: Preguntas de opción múltiple  
**Participantes**: Todos los jugadores vivos  
**Objetivo**: Responder correctamente lo más rápido posible  
**Eliminación**: Cooldown por respuesta incorrecta (no inmediata)

### Flujo

```
1. Laravel envía pregunta + 4 opciones + tiempo (15-20s)
2. Todos los jugadores ven la misma pregunta
3. Jugadores envían respuesta + timestamp
4. Laravel valida:
   - Correcta → jugador sigue
   - Incorrecta → cooldown (no puede responder próxima pregunta)
5. Repetir hasta reducir ~40-50% jugadores
```

### Backend: Lógica

```php
// app/Actions/Games/Millionaire/SubmitAnswer.php
public function handle(Player $player, int $questionId, string $answer): bool
{
    // Verificar cooldown
    if ($player->millionaire_cooldown_until > now()) {
        throw new \Exception('Estás en cooldown');
    }

    $question = Question::findOrFail($questionId);
    $correct = ($answer === $question->correct_answer);

    if (!$correct) {
        // Aplicar cooldown (1 pregunta)
        $player->millionaire_cooldown_until = now()->addMinutes(5);
        $player->save();
    }

    broadcast(new AnswerResult($player->id, $correct));

    return $correct;
}
```

### Frontend: Store

```typescript
// modules/games/millionaire/millionaire.store.ts
export const useMillionaireStore = defineStore('millionaire', {
  state: () => ({
    currentQuestion: null as Question | null,
    answers: [] as string[],
    countdown: 15,
    hasAnswered: false,
    isInCooldown: false,
  }),

  actions: {
    setQuestion(question: Question) {
      this.currentQuestion = question
      this.answers = question.answers
      this.hasAnswered = false
      this.startCountdown(question.duration)
    },

    async submitAnswer(answer: string) {
      if (this.hasAnswered || this.isInCooldown) return

      this.hasAnswered = true

      try {
        await apiService.post('/millionaire/answer', {
          question_id: this.currentQuestion.id,
          answer,
        })
      } catch (error) {
        console.error('Error submitting answer:', error)
      }
    },

    startCountdown(duration: number) {
      this.countdown = duration
      const interval = setInterval(() => {
        this.countdown--
        if (this.countdown <= 0) {
          clearInterval(interval)
        }
      }, 1000)
    },
  },
})
```

---

## Deletréalo (Spell)

### Mecánica

**Tipo**: Deletreo de palabras con grabación de audio  
**Participantes**: Uno a la vez (selección aleatoria)  
**Objetivo**: Deletrear correctamente la palabra asignada  
**Eliminación**: Directa si falla o timeout

### Flujo

```
1. Laravel selecciona jugador aleatorio vivo
2. Laravel asigna palabra
3. Jugador graba audio deletreando
4. Audio se envía a Laravel → S3
5. Supervisor escucha y valida
6. Supervisor marca como correcto/incorrecto
7. Laravel elimina si es incorrecto
```

### Backend: Selección

```php
// app/Actions/Games/Spell/SelectPlayer.php
public function handle(): Player
{
    $alivePlayers = Player::where('status', PlayerStatus::ALIVE)->get();

    if ($alivePlayers->isEmpty()) {
        throw new \Exception('No hay jugadores vivos');
    }

    $player = $alivePlayers->random();
    $word = $this->getRandomWord();

    broadcast(new PlayerSelected($player->id, $word));

    return $player;
}

private function getRandomWord(): string
{
    $words = [
        'elefante', 'murciélago', 'hipopótamo', 'extraordinario',
        'psicología', 'otorrinolaringólogo', 'paralelepípedo',
    ];

    return $words[array_rand($words)];
}
```

### Frontend: Grabación de Audio

```typescript
// modules/games/spell/spell.recorder.ts
export class SpellRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []

  async start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    this.mediaRecorder = new MediaRecorder(stream)
    this.audioChunks = []

    this.mediaRecorder.ondataavailable = (event) => {
      this.audioChunks.push(event.data)
    }

    this.mediaRecorder.start()
  }

  stop(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) throw new Error('No recorder')

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' })
        resolve(audioBlob)
      }

      this.mediaRecorder.stop()
    })
  }

  async submit(audioBlob: Blob, playerId: number, word: string) {
    const formData = new FormData()
    formData.append('audio', audioBlob, 'spell-audio.webm')
    formData.append('player_id', String(playerId))
    formData.append('word', word)

    await apiService.post('/spell/submit', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }
}
```

### Supervisor: Validación

```vue
<!-- modules/supervisor/AudioReview.vue -->
<template>
  <div class="audio-review">
    <h3>Audios Pendientes</h3>

    <div v-if="pendingAudios.length === 0">No hay audios pendientes</div>

    <div v-for="audio in pendingAudios" :key="audio.id" class="audio-item">
      <div class="player-info">
        <span class="player-number">{{ audio.player.number }}</span>
        <span class="player-nickname">{{ audio.player.nickname }}</span>
      </div>

      <div class="word">
        Palabra: <strong>{{ audio.word }}</strong>
      </div>

      <audio :src="audio.url" controls></audio>

      <div class="actions">
        <button @click="approve(audio.id)" class="btn-approve">✅ Correcto</button>
        <button @click="reject(audio.id)" class="btn-reject">❌ Incorrecto</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiService } from '@/modules/core/services/api.service'

const pendingAudios = ref([])

const loadPendingAudios = async () => {
  const response = await apiService.get('/spell/pending')
  pendingAudios.value = response.data
}

const approve = async (audioId: number) => {
  await apiService.post(`/spell/${audioId}/validate`, { approved: true })
  await loadPendingAudios()
}

const reject = async (audioId: number) => {
  await apiService.post(`/spell/${audioId}/validate`, { approved: false })
  await loadPendingAudios()
}

onMounted(loadPendingAudios)
</script>
```

---

## La Cuerda (Rope)

### Mecánica

**Tipo**: Competencia de clicking en grupos  
**Participantes**: Todos divididos en grupos de ~5  
**Objetivo**: Hacer más clicks que el grupo contrario  
**Eliminación**: Grupo completo perdedor eliminado

### Flujo

```
1. Laravel divide jugadores en grupos (dinámico)
2. Cada grupo tiene su canal WebSocket
3. Jugadores hacen click → Laravel cuenta
4. Laravel calcula tensión de cuerda (-1 a 1)
5. Laravel emite estado cada 100ms
6. Three.js anima cuerda según tensión
7. Primer grupo que llega al límite → gana
8. Grupo perdedor completamente eliminado
```

### Backend: Formación de Grupos

```php
// app/Services/Game/GroupingService.php
public function createGroups(): array
{
    $players = Player::where('status', PlayerStatus::ALIVE)->get();
    $count = $players->count();

    if ($count < 6) {
        // Muy pocos, todos contra todos
        return [
            ['group_id' => 1, 'players' => $players->take(ceil($count / 2))],
            ['group_id' => 2, 'players' => $players->skip(ceil($count / 2))],
        ];
    }

    $groupSize = 5;
    $groups = [];
    $groupId = 1;

    foreach ($players->chunk($groupSize) as $chunk) {
        $groups[] = [
            'group_id' => $groupId++,
            'players' => $chunk,
        ];
    }

    return $groups;
}
```

### Backend: Cálculo de Tensión

```php
// app/Actions/Games/Rope/UpdateTension.php
public function handle(int $groupId): void
{
    $group1Clicks = Cache::get("rope:group:1:clicks", 0);
    $group2Clicks = Cache::get("rope:group:2:clicks", 0);

    $total = $group1Clicks + $group2Clicks;

    if ($total === 0) {
        $tension = 0;
    } else {
        // -1 (grupo 1 gana) a 1 (grupo 2 gana)
        $tension = ($group2Clicks - $group1Clicks) / $total;
    }

    broadcast(new RopeStateUpdated($tension, $group1Clicks, $group2Clicks));

    // Verificar ganador
    if ($group1Clicks >= 100) {
        $this->declareWinner(1);
    } elseif ($group2Clicks >= 100) {
        $this->declareWinner(2);
    }
}

private function declareWinner(int $groupId): void
{
    $loserGroupId = $groupId === 1 ? 2 : 1;

    $losers = RopePlayer::where('group_id', $loserGroupId)
        ->with('player')
        ->get()
        ->pluck('player');

    foreach ($losers as $player) {
        app(EliminatePlayer::class)->handle($player);
    }

    broadcast(new GroupEliminated($loserGroupId, $losers));
}
```

---

## La Ruleta (Final)

### Mecánica

**Tipo**: Acumulación de puntos aleatorios  
**Participantes**: Todos los sobrevivientes  
**Objetivo**: Ser el primero en llegar a 1000 puntos  
**Resultado**: Solo 1 ganador, resto eliminados

### Flujo

```
1. Todos los sobrevivientes comienzan con 0 puntos
2. Jugador hace click en ruleta
3. Ruleta gira (animación)
4. Laravel asigna puntaje aleatorio (0-100)
5. Se acumula al total del jugador
6. Primer jugador en llegar a 1000 → GANA
7. Resto automáticamente eliminados
```

### Backend: Lógica

```php
// app/Actions/Games/Roulette/SpinRoulette.php
public function handle(Player $player): int
{
    $score = random_int(0, 100);

    $player->roulette_score += $score;
    $player->save();

    broadcast(new ScoreUpdated($player->id, $score, $player->roulette_score));

    if ($player->roulette_score >= 1000) {
        $this->declareWinner($player);
    }

    return $score;
}

private function declareWinner(Player $winner): void
{
    // Eliminar a todos los demás
    Player::where('status', PlayerStatus::ALIVE)
        ->where('id', '!=', $winner->id)
        ->update([
            'status' => PlayerStatus::ELIMINATED,
            'eliminated_at' => now(),
        ]);

    broadcast(new WinnerDeclared($winner));

    app(ShowMachine::class)->next(); // → WINNER phase
}
```

### Frontend: Animación Ruleta

```typescript
// modules/games/roulette/roulette.visual.ts
export class RouletteVisual {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private rotation = 0
  private spinning = false

  spin(targetScore: number) {
    this.spinning = true
    const spins = 5 + Math.random() * 3 // 5-8 vueltas
    const totalRotation = spins * 360 + this.scoreToAngle(targetScore)

    this.animateRotation(totalRotation)
  }

  private animateRotation(target: number) {
    const start = this.rotation
    const duration = 3000 // 3 segundos
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Easing out
      const eased = 1 - Math.pow(1 - progress, 3)

      this.rotation = start + target * eased
      this.draw()

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        this.spinning = false
      }
    }

    animate()
  }
}
```

---

## Juegos Bonus

### Características Generales

Los juegos bonus son **opcionales** y **NO eliminatorios**. El Supervisor los activa manualmente entre juegos principales.

**Propósito**:

- Entretenimiento adicional
- Generar puntos para scoreboard
- Dar ventajas/premios
- Aumentar tensión

**Reglas compartidas**:

- ✅ Todos los jugadores participan
- ✅ Generan score (visible en scoreboard)
- ❌ NO eliminan jugadores
- ✅ Pueden dar ventajas futuras (opcional)

---

## Bonus Game 1: ¡A buscar! (Word Search)

### Mecánica

**Tipo**: Sopa de letras  
**Participantes**: Todos los jugadores vivos  
**Objetivo**: Encontrar todas las palabras ocultas en el menor tiempo  
**Victoria**: Primer jugador en completar O más palabras en tiempo límite

### Flujo

```
1. Supervisor activa el juego bonus
2. Laravel genera grid 10×10 con 5-8 palabras
3. Broadcast del mismo grid a todos los jugadores
4. Jugadores buscan y seleccionan palabras
5. Frontend valida localmente, backend confirma
6. Primer jugador en completar todo gana
7. Actualización de scoreboard
8. Retorno al flujo principal
```

### Backend: Generación de Grid

```php
// app/Domain/Bonus/WordSearch/GenerateGridAction.php
public function execute(array $words): array
{
    $size = 10;
    $grid = $this->createEmptyGrid($size);
    $placements = [];

    foreach ($words as $word) {
        $placement = $this->placeWord($grid, $word, $size);
        if ($placement) {
            $placements[] = $placement;
        }
    }

    // Fill empty spaces
    $this->fillEmptySpaces($grid);

    return [
        'grid' => $grid,
        'placements' => $placements,
        'words' => $words
    ];
}
```

### Backend: Validación

```php
// app/Domain/Bonus/WordSearch/ValidateWordAction.php
public function execute(
    Player $player,
    BonusSession $session,
    array $cellIds
): bool {
    // 1. Verificar que el juego esté activo
    if (!$session->isActive()) {
        throw new GameNotActiveException();
    }

    // 2. Validar que las celdas formen una palabra válida
    $word = $this->validateCells($cellIds, $session->placements);
    if (!$word) {
        return false;
    }

    // 3. Verificar que no haya encontrado esta palabra antes
    if ($session->hasPlayerFoundWord($player, $word)) {
        return false;
    }

    // 4. Registrar palabra encontrada
    $session->markWordFound($player, $word, now());
    broadcast(new WordFound($player, $word));

    // 5. Check si completó todas
    if ($session->hasPlayerCompletedAll($player)) {
        $this->handleCompletion($player, $session);
    }

    return true;
}
```

### Frontend: Module Structure

```
modules/games/word-search/
├── WordSearchScene.vue       # Main component
├── WordSearchGrid.vue        # Interactive grid (HTML/CSS)
├── word-search.store.ts      # Pinia store
├── word-search.logic.ts      # Grid generation
├── word-search.socket.ts     # WebSocket listeners
└── word-search.types.ts      # TypeScript interfaces
```

### Frontend: Store

```typescript
// modules/games/word-search/word-search.store.ts
export const useWordSearchStore = defineStore('wordSearch', () => {
  const grid = ref<GridCell[]>([])
  const words = ref<string[]>([])
  const foundWords = ref<string[]>([])
  const startTime = ref<number | null>(null)
  const isActive = ref(false)

  const isComplete = computed(() => {
    return foundWords.value.length === words.value.length
  })

  function initialize(serverWords: string[], serverGrid: GridCell[]) {
    words.value = serverWords
    grid.value = serverGrid
    foundWords.value = []
    startTime.value = Date.now()
    isActive.value = true
  }

  function selectWord(cellIds: number[]): string | null {
    const word = validateWord(cellIds, placements.value)

    if (word && !foundWords.value.includes(word)) {
      foundWords.value.push(word)
      markCellsAsFound(cellIds)

      if (isComplete.value) {
        submitCompletion()
      }

      return word
    }

    return null
  }

  return { grid, words, foundWords, isActive, isComplete, initialize, selectWord }
})
```

### Scoring

```php
// Menos tiempo = más puntos
$score = max(0, 500 - floor(($timeMs / 300000) * 500));
```

---

## Bonus Game 2: No Lo Choques (Flappy Bird)

### Mecánica

**Tipo**: Arcade 2D (clon Flappy Bird)  
**Participantes**: Todos los jugadores vivos  
**Objetivo**: Sobrevivir el mayor tiempo posible sin chocar  
**Victoria**: Jugador con tiempo de supervivencia más largo

### Flujo

```
1. Supervisor activa el juego bonus
2. Todos los jugadores cargan el juego (Phaser)
3. Juegos corren localmente (sin sincronización de frames)
4. Jugador choca → envía tiempo de supervivencia al backend
5. Backend valida tiempo razonable
6. Actualización de ranking en tiempo real
7. Último jugador en chocar o timeout termina el juego
8. Scoreboard actualizado, retorno al flujo principal
```

### Backend: Validación Anti-Cheat

```php
// app/Domain/Bonus/Flappy/ValidateFlappyResultAction.php
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
    $maxReasonableTime = 300000; // 5 minutos

    if ($survivalTimeMs > $maxReasonableTime) {
        Log::warning('Suspicious flappy time', [
            'player_id' => $player->id,
            'time' => $survivalTimeMs
        ]);

        $survivalTimeMs = $maxReasonableTime;
    }

    if ($survivalTimeMs < 1000) {
        // Menos de 1 segundo OK pero sin puntos
    }

    // 3. Verificar que no haya enviado antes
    if ($session->hasPlayerSubmitted($player)) {
        throw new DuplicateSubmissionException();
    }

    // 4. Validar timestamp
    $serverTime = now()->timestamp;
    $timeDiff = abs($serverTime - $clientTimestamp);

    if ($timeDiff > 10) {
        Log::warning('Flappy time mismatch', [
            'player_id' => $player->id,
            'diff' => $timeDiff
        ]);
    }

    // 5. Registrar resultado
    $session->recordResult($player, $survivalTimeMs, $serverTime);

    // 6. Calcular score
    $score = floor($survivalTimeMs / 100); // 1 punto cada 0.1s

    app(ScoreboardService::class)->addBonusScore(
        player: $player,
        game: 'flappy',
        score: $score,
        metadata: ['survival_time' => $survivalTimeMs]
    );

    // 7. Broadcast
    broadcast(new PlayerCrashedFlappy($player, $survivalTimeMs));

    return true;
}
```

### Frontend: Module Structure

```
modules/games/flappy/
├── FlappyScene.vue           # Vue wrapper
├── flappy.game.ts            # Phaser game instance
├── flappy.scenes.ts          # Phaser scenes (Main, GameOver)
├── flappy.store.ts           # Pinia store
├── flappy.socket.ts          # WebSocket listeners
└── flappy.logic.ts           # Scoring utils
```

### Frontend: Phaser Integration

```typescript
// modules/games/flappy/flappy.game.ts
import Phaser from 'phaser'
import { MainScene } from './flappy.scenes'

export interface FlappyGameConfig {
  parent: string
  onStart: () => void
  onCrash: (time: number) => void
  onTimeUpdate: (time: number) => void
}

export function createFlappyGame(config: FlappyGameConfig): Phaser.Game {
  return new Phaser.Game({
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
  })
}
```

### Frontend: Vue Component Lifecycle

```vue
<!-- modules/games/flappy/FlappyScene.vue -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { createFlappyGame } from './flappy.game'
import type Phaser from 'phaser'

let game: Phaser.Game | null = null
const elapsedTime = ref(0)

onMounted(() => {
  game = createFlappyGame({
    parent: 'flappy-game',
    onStart: handleStart,
    onCrash: handleCrash,
    onTimeUpdate: handleTimeUpdate,
  })
})

onUnmounted(() => {
  // CRITICAL: Destroy Phaser to prevent memory leaks
  if (game) {
    game.destroy(true)
    game = null
  }
})

function handleCrash(time: number) {
  // Enviar resultado al backend
  apiService.post('/bonus/flappy/result', {
    survival_time: time,
    timestamp: Date.now(),
  })
}
</script>
```

### Scoring

```php
// Más tiempo = más puntos (lineal)
$score = floor($survivalTimeMs / 100); // 1 punto cada 0.1 segundos
```

---

## Bonus Games: Integración con Flujo Principal

### Supervisor Controls

```php
// app/Actions/Supervisor/StartBonusGameAction.php
public function execute(string $gameType): void
{
    // Validar que no haya juego activo
    if (BonusSession::hasActive()) {
        throw new \Exception('Ya hay un juego bonus activo');
    }

    // Crear sesión
    $session = BonusSession::create([
        'type' => $gameType,
        'started_at' => now(),
        'status' => 'active'
    ]);

    // Broadcast inicio
    broadcast(new BonusGameStarted($gameType, $session->id));
}
```

### Router Integration

```typescript
// router/index.ts (additions)
{
  path: '/bonus/word-search',
  name: 'BonusWordSearch',
  component: () => import('@/modules/games/word-search/WordSearchScene.vue'),
  meta: { requiresAuth: true, layout: 'game' }
},
{
  path: '/bonus/flappy',
  name: 'BonusFlappy',
  component: () => import('@/modules/games/flappy/FlappyScene.vue'),
  meta: { requiresAuth: true, layout: 'game' }
}
```

### State Machine (NO integrado)

Los bonus games **NO** forman parte del state machine principal. Son paralelos:

```
MAIN STATE MACHINE       BONUS (separate)
==================       ================
MILLIONAIRE
  (pause)         →      WORD_SEARCH
  (wait)                 (ends)
  (resume)        ←
SPELL
  ...
```

---

## Matemáticas de Eliminación

### Objetivo

Reducir progresivamente de 30-50 jugadores a 1 ganador en ~40-50 minutos.

### Tabla Ejemplo (30 jugadores)

| Fase         | Entrantes | Tasa Eliminación | Salientes     |
| ------------ | --------- | ---------------- | ------------- |
| Millonario 1 | 30        | ~40%             | 18            |
| Deletréalo 1 | 18        | 3-4 individuales | 14-15         |
| La Cuerda    | 14-15     | 1 grupo (~5)     | 9-10          |
| Millonario 2 | 9-10      | ~40%             | 5-6           |
| Deletréalo 2 | 5-6       | 1-2 individuales | 3-5           |
| Ruleta       | 3-5       | Todos excepto 1  | **1 GANADOR** |

### Ajuste Dinámico

```php
// app/Services/Game/EliminationService.php
public function calculateRequiredEliminations(ShowPhase $phase, int $currentPlayers): int
{
    return match($phase) {
        ShowPhase::MILLIONAIRE => (int) ceil($currentPlayers * 0.4),
        ShowPhase::SPELL => min(3, $currentPlayers - 3), // Dejar al menos 3
        ShowPhase::ROPE => $this->calculateRopeEliminations($currentPlayers),
        ShowPhase::ROULETTE => $currentPlayers - 1, // Todos menos 1
        default => 0,
    };
}
```

---

## Resumen de Implementación

### Backend (Laravel)

- State Machine orquesta flujo
- Actions ejecutan casos de uso
- Events broadcast a Reverb
- Services calculan lógica compleja

### Frontend (Vue)

- Stores guardan estado
- Sockets escuchan eventos
- Components renderizan UI
- Services manejan infraestructura

### Comunicación

- Todo via WebSockets (Reverb)
- HTTP solo para autenticación y uploads
- Estado fluye: Laravel → Reverb → Vue

### Persistencia

- Database: jugadores, audios, historial
- S3: archivos de audio
- LocalStorage: token, preferencias (opcional)
