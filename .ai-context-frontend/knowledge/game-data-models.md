# Modelos de Datos de Juegos

## Descripción General

Consolidación de todos los modelos de datos (TypeScript interfaces y schemas de base de datos) utilizados en los diferentes mini-juegos de la plataforma. Este documento sirve como referencia única para mantener consistencia entre frontend y backend.

---

## Tabla de Contenidos

1. [Modelos Comunes](#modelos-comunes)
2. [Millionaire](#millionaire)
3. [Rope (Jala la Cuerda)](#rope-jala-la-cuerda)
4. [Spell (Deletreo)](#spell-deletreo)
5. [Roulette (Ruleta)](#roulette-ruleta)
6. [Word Search (Sopa de Letras)](#word-search-sopa-de-letras)
7. [Flappy Bird](#flappy-bird)
8. [Schemas de Base de Datos](#schemas-de-base-de-datos)

---

## Modelos Comunes

### Player

```typescript
interface Player {
  id: string
  name: string
  number: number // Usado como ícono en PlayerCard
  avatar?: string // URL (opcional, deprecated)
  color: string // Color asignado (hex)
  status: PlayerStatus
  score: number
  eliminated: boolean
  disconnected: boolean
  reconnectToken?: string
  createdAt: number
  updatedAt: number
}

type PlayerStatus = 'lobby' | 'ready' | 'playing' | 'eliminated' | 'winner' | 'disconnected'
```

### Session

```typescript
interface Session {
  id: string
  code: string // Código de 6 caracteres para unirse
  name: string
  status: SessionStatus
  currentRound: number
  maxPlayers: number
  players: Player[]
  supervisors: string[] // User IDs
  settings: SessionSettings
  createdAt: number
  startedAt?: number
  endedAt?: number
}

type SessionStatus = 'waiting' | 'starting' | 'playing' | 'paused' | 'completed'

interface SessionSettings {
  allowReconnect: boolean
  eliminationRate: number // 0.4 = 40%
  roundDuration: number // segundos
  autoStart: boolean
  voiceNarrator: boolean
}
```

### Round

```typescript
interface Round {
  id: string
  sessionId: string
  number: number
  gameType: GameType
  status: RoundStatus
  startedAt?: number
  endedAt?: number
  duration: number // segundos planificados
  metadata: Record<string, any> // Configuración específica del juego
  results?: RoundResults
}

type GameType = 'millionaire' | 'rope' | 'spell' | 'roulette' | 'word-search' | 'flappy'
type RoundStatus = 'pending' | 'instructions' | 'playing' | 'evaluating' | 'completed'

interface RoundResults {
  winners: string[] // Player IDs
  eliminated: string[] // Player IDs
  rankings: PlayerRanking[]
  duration: number // segundos reales
  completedAt: number
}

interface PlayerRanking {
  playerId: string
  playerName: string
  rank: number
  score: number
  metrics: Record<string, number> // Métricas específicas del juego
}
```

### Achievement

```typescript
interface Achievement {
  id: string
  slug: string // 'first-blood', 'speedster', etc.
  name: string // i18n key
  description: string // i18n key
  icon: string // URL o nombre de ícono
  category: AchievementCategory
  rarity: AchievementRarity
  points: number
  requirement: AchievementRequirement
  createdAt: number
}

type AchievementCategory = 'play' | 'pass' | 'win' | 'bonus' | 'master'
type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary'

interface AchievementRequirement {
  type: 'play' | 'win' | 'score' | 'streak' | 'time' | 'special'
  target: number
  conditions?: Record<string, any>
}

interface PlayerAchievement {
  id: string
  playerId: string
  achievementId: string
  unlockedAt: number
  sessionId?: string
  roundId?: string
  progress?: number // Para achievements progresivos
}
```

---

## Millionaire

### MillionaireQuestion

```typescript
interface MillionaireQuestion {
  id: string
  text: string
  category: string
  difficulty: MillionaireDifficulty
  options: MillionaireOption[]
  correctOptionId: string
  timeLimit: number // segundos
  points: number
  metadata?: {
    source?: string
    tags?: string[]
  }
}

type MillionaireDifficulty = 'easy' | 'medium' | 'hard'

interface MillionaireOption {
  id: string // 'A', 'B', 'C', 'D'
  text: string
}
```

### MillionaireAttempt

```typescript
interface MillionaireAttempt {
  id: string
  playerId: string
  sessionId: string
  roundId: string
  questionId: string
  selectedOptionId?: string // undefined si no respondió
  isCorrect: boolean
  timeSpent: number // milisegundos
  jokerUsed: boolean
  jokerType?: 'fifty-fifty'
  pointsEarned: number
  submittedAt: number
}
```

### MillionaireResult

```typescript
interface MillionaireResult {
  playerId: string
  totalQuestions: number
  correctAnswers: number
  totalTimeSpent: number // milisegundos
  jokersUsed: number
  totalPoints: number
  rank: number
  eliminated: boolean
  accuracy: number // 0.0 - 1.0
}
```

### MillionaireRoundState

```typescript
interface MillionaireRoundState {
  currentQuestionIndex: number
  questions: MillionaireQuestion[]
  timeRemaining: number
  playersCompleted: string[] // Player IDs
  attempts: Map<string, MillionaireAttempt[]> // playerId -> attempts
}
```

---

## Rope (Jala la Cuerda)

### RopeTeam

```typescript
interface RopeTeam {
  id: string
  name: string
  color: string // Color del equipo
  members: RopeTeamMember[]
  wins: number
  eliminated: boolean
  createdAt: number
}

interface RopeTeamMember {
  playerId: string
  playerName: string
  joinedAt: number
  votedForName?: string
}
```

### RopeMatch

```typescript
interface RopeMatch {
  id: string
  roundId: string
  matchNumber: number
  team1Id: string
  team2Id: string
  player1Id: string // Representante equipo 1
  player2Id: string // Representante equipo 2
  winnerId?: string // Player ID del ganador
  status: RopeMatchStatus
  duration: number // segundos
  startedAt?: number
  endedAt?: number
  tensionHistory: RopeTensionSnapshot[]
}

type RopeMatchStatus = 'pending' | 'active' | 'completed'

interface RopeTensionSnapshot {
  timestamp: number
  tension: number // -1.0 (team1) a 1.0 (team2)
  player1Clicks: number
  player2Clicks: number
}
```

### RopeClickEvent

```typescript
interface RopeClickEvent {
  playerId: string
  matchId: string
  timestamp: number
  clientTimestamp: number // Para detectar lag
  validated: boolean
}
```

### RopeResult

```typescript
interface RopeResult {
  teamId: string
  teamName: string
  totalWins: number
  totalMatches: number
  eliminated: boolean
  members: string[] // Player IDs
  averageClickRate: number // clicks por segundo
}
```

---

## Spell (Deletreo)

### SpellWord

```typescript
interface SpellWord {
  id: string
  word: string
  difficulty: SpellDifficulty
  category: string
  definition?: string
  language: 'es-CO' | 'en-US'
  length: number
  points: number
}

type SpellDifficulty = 'easy' | 'medium' | 'hard' | 'expert'
```

### SpellAttempt

```typescript
interface SpellAttempt {
  id: string
  playerId: string
  sessionId: string
  roundId: string
  wordId: string
  originalWord: string
  typedWord: string
  isCorrect: boolean
  timeSpent: number // milisegundos
  mistakes: SpellMistake[]
  pointsEarned: number
  submittedAt: number
  exploded: boolean // Si se acabó el tiempo
}

interface SpellMistake {
  position: number
  expected: string
  typed: string
}
```

### SpellResult

```typescript
interface SpellResult {
  playerId: string
  totalWords: number
  correctWords: number
  totalTimeSpent: number
  averageTimePerWord: number
  totalMistakes: number
  explosions: number
  totalPoints: number
  rank: number
  eliminated: boolean
  accuracy: number // 0.0 - 1.0
}
```

### SpellBombState

```typescript
interface SpellBombState {
  playerId: string
  wordId: string
  timeLimit: number // segundos
  timeRemaining: number
  currentInput: string
  locked: boolean // true cuando se muestra la palabra
}
```

---

## Roulette (Ruleta)

### RouletteCategory

```typescript
interface RouletteCategory {
  id: string
  name: string // i18n key
  icon: string
  color: string
  weight: number // Probabilidad relativa
  questions: RouletteQuestion[]
}
```

### RouletteQuestion

```typescript
interface RouletteQuestion {
  id: string
  categoryId: string
  text: string
  options: RouletteOption[]
  correctOptionId: string
  timeLimit: number
  points: number
  difficulty: 'easy' | 'medium' | 'hard'
}

interface RouletteOption {
  id: string
  text: string
}
```

### RouletteSpinResult

```typescript
interface RouletteSpinResult {
  id: string
  roundId: string
  spinNumber: number
  categoryId: string
  categoryName: string
  questionId: string
  spunAt: number
  duration: number // milisegundos de animación
}
```

### RouletteAttempt

```typescript
interface RouletteAttempt {
  id: string
  playerId: string
  roundId: string
  spinResultId: string
  questionId: string
  selectedOptionId?: string
  isCorrect: boolean
  timeSpent: number
  pointsEarned: number
  submittedAt: number
}
```

### RouletteResult

```typescript
interface RouletteResult {
  playerId: string
  totalSpins: number
  correctAnswers: number
  totalTimeSpent: number
  averageResponseTime: number
  totalPoints: number
  rank: number
  eliminated: boolean
  categoryPerformance: Map<string, number> // categoryId -> correct answers
}
```

---

## Word Search (Sopa de Letras)

### WordSearchGrid

```typescript
interface WordSearchGrid {
  id: string
  playerId: string
  roundId: string
  size: number // 15x15
  cells: string[][] // Matriz de letras
  words: WordSearchWord[]
  seed: number // Para reproducibilidad
  generatedAt: number
}

interface WordSearchWord {
  word: string
  startRow: number
  startCol: number
  direction: WordSearchDirection
  found: boolean
  foundAt?: number
}

type WordSearchDirection =
  | 'horizontal'
  | 'vertical'
  | 'diagonal'
  | 'horizontal-reverse'
  | 'vertical-reverse'
  | 'diagonal-reverse'
```

### WordSearchSelection

```typescript
interface WordSearchSelection {
  playerId: string
  startRow: number
  startCol: number
  endRow: number
  endCol: number
  selectedWord: string
  timestamp: number
}
```

### WordSearchAttempt

```typescript
interface WordSearchAttempt {
  id: string
  playerId: string
  roundId: string
  gridId: string
  word: string
  isCorrect: boolean
  timeSpent: number // milisegundos desde inicio
  selection: WordSearchSelection
  validatedAt: number
}
```

### WordSearchResult

```typescript
interface WordSearchResult {
  playerId: string
  totalWords: number
  wordsFound: number
  totalTimeSpent: number
  completedGrid: boolean
  totalPoints: number
  rank: number
  speed: number // palabras por minuto
}
```

---

## Flappy Bird

### FlappyObstacle

```typescript
interface FlappyObstacle {
  id: string
  x: number
  y: number
  gapY: number
  gapSize: number
  width: number
  passed: boolean
}
```

### FlappyAttempt

```typescript
interface FlappyAttempt {
  id: string
  playerId: string
  sessionId: string
  roundId: string
  score: number // Obstáculos pasados
  survivalTime: number // milisegundos
  crashes: number
  maxHeight: number
  minHeight: number
  totalClicks: number
  submittedAt: number
  gameOver: boolean
}
```

### FlappyResult

```typescript
interface FlappyResult {
  playerId: string
  bestScore: number
  longestSurvival: number
  totalAttempts: number
  averageScore: number
  rank: number
  totalPoints: number
}
```

### FlappyPhysicsState

```typescript
interface FlappyPhysicsState {
  birdY: number
  birdVelocity: number
  birdRotation: number
  obstacles: FlappyObstacle[]
  score: number
  alive: boolean
}
```

---

## Schemas de Base de Datos

### Tabla: sessions

```sql
CREATE TABLE sessions (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(6) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  status ENUM('waiting', 'starting', 'playing', 'paused', 'completed') NOT NULL DEFAULT 'waiting',
  current_round INT NOT NULL DEFAULT 0,
  max_players INT NOT NULL DEFAULT 50,
  settings JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP NULL,
  ended_at TIMESTAMP NULL,
  INDEX idx_code (code),
  INDEX idx_status (status)
);
```

### Tabla: players

```sql
CREATE TABLE players (
  id VARCHAR(36) PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  number INT NOT NULL,
  color VARCHAR(7) NOT NULL,
  status ENUM('lobby', 'ready', 'playing', 'eliminated', 'winner', 'disconnected') NOT NULL DEFAULT 'lobby',
  score INT NOT NULL DEFAULT 0,
  eliminated BOOLEAN NOT NULL DEFAULT FALSE,
  disconnected BOOLEAN NOT NULL DEFAULT FALSE,
  reconnect_token VARCHAR(64) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  INDEX idx_session (session_id),
  INDEX idx_status (status),
  UNIQUE KEY unique_player_number (session_id, number)
);
```

### Tabla: rounds

```sql
CREATE TABLE rounds (
  id VARCHAR(36) PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  number INT NOT NULL,
  game_type ENUM('millionaire', 'rope', 'spell', 'roulette', 'word-search', 'flappy') NOT NULL,
  status ENUM('pending', 'instructions', 'playing', 'evaluating', 'completed') NOT NULL DEFAULT 'pending',
  duration INT NOT NULL,
  metadata JSON,
  started_at TIMESTAMP NULL,
  ended_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  INDEX idx_session (session_id),
  INDEX idx_status (status),
  UNIQUE KEY unique_round_number (session_id, number)
);
```

### Tabla: achievements

```sql
CREATE TABLE achievements (
  id VARCHAR(36) PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(255),
  category ENUM('play', 'pass', 'win', 'bonus', 'master') NOT NULL,
  rarity ENUM('common', 'rare', 'epic', 'legendary') NOT NULL DEFAULT 'common',
  points INT NOT NULL DEFAULT 10,
  requirement JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_rarity (rarity)
);
```

### Tabla: player_achievements

```sql
CREATE TABLE player_achievements (
  id VARCHAR(36) PRIMARY KEY,
  player_id VARCHAR(36) NOT NULL,
  achievement_id VARCHAR(36) NOT NULL,
  session_id VARCHAR(36) NULL,
  round_id VARCHAR(36) NULL,
  progress INT DEFAULT 0,
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL,
  FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE SET NULL,
  INDEX idx_player (player_id),
  INDEX idx_achievement (achievement_id),
  UNIQUE KEY unique_player_achievement (player_id, achievement_id)
);
```

### Tabla: millionaire_attempts

```sql
CREATE TABLE millionaire_attempts (
  id VARCHAR(36) PRIMARY KEY,
  player_id VARCHAR(36) NOT NULL,
  session_id VARCHAR(36) NOT NULL,
  round_id VARCHAR(36) NOT NULL,
  question_id VARCHAR(36) NOT NULL,
  selected_option_id VARCHAR(10) NULL,
  is_correct BOOLEAN NOT NULL,
  time_spent INT NOT NULL,
  joker_used BOOLEAN NOT NULL DEFAULT FALSE,
  joker_type VARCHAR(50) NULL,
  points_earned INT NOT NULL DEFAULT 0,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
  INDEX idx_player (player_id),
  INDEX idx_round (round_id)
);
```

### Tabla: rope_teams

```sql
CREATE TABLE rope_teams (
  id VARCHAR(36) PRIMARY KEY,
  round_id VARCHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) NOT NULL,
  wins INT NOT NULL DEFAULT 0,
  eliminated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
  INDEX idx_round (round_id)
);
```

### Tabla: rope_team_members

```sql
CREATE TABLE rope_team_members (
  id VARCHAR(36) PRIMARY KEY,
  team_id VARCHAR(36) NOT NULL,
  player_id VARCHAR(36) NOT NULL,
  voted_for_name VARCHAR(100) NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES rope_teams(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  INDEX idx_team (team_id),
  INDEX idx_player (player_id),
  UNIQUE KEY unique_team_member (team_id, player_id)
);
```

### Tabla: rope_matches

```sql
CREATE TABLE rope_matches (
  id VARCHAR(36) PRIMARY KEY,
  round_id VARCHAR(36) NOT NULL,
  match_number INT NOT NULL,
  team1_id VARCHAR(36) NOT NULL,
  team2_id VARCHAR(36) NOT NULL,
  player1_id VARCHAR(36) NOT NULL,
  player2_id VARCHAR(36) NOT NULL,
  winner_id VARCHAR(36) NULL,
  status ENUM('pending', 'active', 'completed') NOT NULL DEFAULT 'pending',
  duration INT NOT NULL,
  started_at TIMESTAMP NULL,
  ended_at TIMESTAMP NULL,
  FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
  FOREIGN KEY (team1_id) REFERENCES rope_teams(id) ON DELETE CASCADE,
  FOREIGN KEY (team2_id) REFERENCES rope_teams(id) ON DELETE CASCADE,
  FOREIGN KEY (player1_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (player2_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (winner_id) REFERENCES players(id) ON DELETE SET NULL,
  INDEX idx_round (round_id),
  INDEX idx_status (status)
);
```

### Tabla: spell_attempts

```sql
CREATE TABLE spell_attempts (
  id VARCHAR(36) PRIMARY KEY,
  player_id VARCHAR(36) NOT NULL,
  session_id VARCHAR(36) NOT NULL,
  round_id VARCHAR(36) NOT NULL,
  word_id VARCHAR(36) NOT NULL,
  original_word VARCHAR(255) NOT NULL,
  typed_word VARCHAR(255) NOT NULL,
  is_correct BOOLEAN NOT NULL,
  time_spent INT NOT NULL,
  mistakes JSON,
  points_earned INT NOT NULL DEFAULT 0,
  exploded BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
  INDEX idx_player (player_id),
  INDEX idx_round (round_id)
);
```

### Tabla: word_search_grids

```sql
CREATE TABLE word_search_grids (
  id VARCHAR(36) PRIMARY KEY,
  player_id VARCHAR(36) NOT NULL,
  round_id VARCHAR(36) NOT NULL,
  size INT NOT NULL DEFAULT 15,
  cells JSON NOT NULL,
  words JSON NOT NULL,
  seed BIGINT NOT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
  INDEX idx_player (player_id),
  INDEX idx_round (round_id),
  UNIQUE KEY unique_player_grid (player_id, round_id)
);
```

### Tabla: word_search_attempts

```sql
CREATE TABLE word_search_attempts (
  id VARCHAR(36) PRIMARY KEY,
  player_id VARCHAR(36) NOT NULL,
  round_id VARCHAR(36) NOT NULL,
  grid_id VARCHAR(36) NOT NULL,
  word VARCHAR(100) NOT NULL,
  is_correct BOOLEAN NOT NULL,
  time_spent INT NOT NULL,
  selection JSON NOT NULL,
  validated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
  FOREIGN KEY (grid_id) REFERENCES word_search_grids(id) ON DELETE CASCADE,
  INDEX idx_player (player_id),
  INDEX idx_grid (grid_id)
);
```

### Tabla: flappy_attempts

```sql
CREATE TABLE flappy_attempts (
  id VARCHAR(36) PRIMARY KEY,
  player_id VARCHAR(36) NOT NULL,
  session_id VARCHAR(36) NOT NULL,
  round_id VARCHAR(36) NOT NULL,
  score INT NOT NULL DEFAULT 0,
  survival_time INT NOT NULL,
  crashes INT NOT NULL DEFAULT 1,
  max_height FLOAT NOT NULL,
  min_height FLOAT NOT NULL,
  total_clicks INT NOT NULL,
  game_over BOOLEAN NOT NULL DEFAULT TRUE,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
  INDEX idx_player (player_id),
  INDEX idx_round (round_id)
);
```

### Tabla: audits

```sql
CREATE TABLE audits (
  id VARCHAR(36) PRIMARY KEY,
  type ENUM('game', 'player', 'supervisor', 'system') NOT NULL,
  action VARCHAR(100) NOT NULL,
  user_id VARCHAR(36) NULL,
  session_id VARCHAR(36) NULL,
  metadata JSON,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at TIMESTAMP NULL,
  INDEX idx_type (type),
  INDEX idx_action (action),
  INDEX idx_user (user_id),
  INDEX idx_session (session_id),
  INDEX idx_created (created_at),
  INDEX idx_archived (archived)
);
```

### Tabla: soundtracks

```sql
CREATE TABLE soundtracks (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  artist VARCHAR(255) NULL,
  file_path VARCHAR(500) NOT NULL,
  artwork_path VARCHAR(500) NULL,
  duration FLOAT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  metadata JSON,
  uploaded_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_uploaded_by (uploaded_by)
);
```

---

## Relaciones entre Modelos

### Session → Player (1:N)

Una sesión tiene múltiples jugadores.

### Session → Round (1:N)

Una sesión tiene múltiples rondas.

### Round → Attempts (1:N)

Una ronda tiene múltiples intentos (millionaire_attempts, spell_attempts, etc.).

### Player → PlayerAchievement (1:N)

Un jugador puede desbloquear múltiples logros.

### Achievement → PlayerAchievement (1:N)

Un logro puede ser desbloqueado por múltiples jugadores.

### Round → RopeTeam (1:N)

Una ronda de Rope tiene múltiples equipos.

### RopeTeam → RopeTeamMember (1:N)

Un equipo tiene múltiples miembros.

### Round → RopeMatch (1:N)

Una ronda de Rope tiene múltiples enfrentamientos.

### Player → WordSearchGrid (1:1 por Round)

Cada jugador tiene una cuadrícula única por ronda.

---

## Convenciones de Nomenclatura

### TypeScript Interfaces

- **PascalCase** para nombres de interfaces: `MillionaireAttempt`, `RopeTeam`
- **camelCase** para propiedades: `playerId`, `isCorrect`
- **Sufijos comunes:**
  - `Result`: Resultado agregado de una ronda
  - `Attempt`: Intento individual de un jugador
  - `State`: Estado en tiempo real
  - `Event`: Evento WebSocket
  - `Payload`: Carga útil de evento

### Tablas SQL

- **snake_case** para nombres de tablas: `millionaire_attempts`, `rope_teams`
- **snake_case** para columnas: `player_id`, `is_correct`
- **Prefijos:**
  - `idx_`: Índices
  - `unique_`: Constraints únicos
  - `fk_`: Foreign keys (opcional)

---

## Validaciones Comunes

### Backend (Laravel)

```php
// Validación de MillionaireAttempt
$validated = $request->validate([
    'question_id' => 'required|uuid|exists:questions,id',
    'selected_option_id' => 'nullable|string|max:10',
    'time_spent' => 'required|integer|min:0|max:180000',
    'joker_used' => 'boolean',
]);
```

### Frontend (TypeScript)

```typescript
function validateMillionaireAttempt(attempt: Partial<MillionaireAttempt>): boolean {
  if (!attempt.playerId || !attempt.questionId) return false
  if (attempt.timeSpent && (attempt.timeSpent < 0 || attempt.timeSpent > 180000)) return false
  return true
}
```

---

## Anti-Cheat Validations

### Millionaire

- Tiempo mínimo por pregunta: 500ms
- Máximo de jokers: 4 por sesión
- Validar que la opción seleccionada exista

### Rope

- Máximo de clicks por segundo: 20
- Detectar patrones automáticos (clics perfectamente sincronizados)
- Validar timestamps del cliente vs servidor (± 2s tolerancia)

### Spell

- Tiempo mínimo por palabra: 1s
- Validar que el input no contenga caracteres inválidos
- Máximo 3 explosiones por ronda

### Flappy

- Máximo tiempo de supervivencia: 10 minutos
- Validar cantidad plausible de obstáculos pasados
- Detectar velocidades de click anormales

---

## Exportación de Tipos

**Ubicación:** `src/types/index.ts`

```typescript
// Modelos comunes
export * from './player.types'
export * from './session.types'
export * from './round.types'
export * from './achievement.types'

// Juegos
export * from './millionaire.types'
export * from './rope.types'
export * from './spell.types'
export * from './roulette.types'
export * from './word-search.types'
export * from './flappy.types'

// Otros
export * from './audio.types'
export * from './instructions.types'
export * from './audit.types'
```

---

## Sincronización Frontend-Backend

Para mantener los modelos sincronizados entre TypeScript (frontend) y PHP (backend):

1. **Usar generadores automáticos:** Herramientas como `ts-to-php` o `openapi-generator`
2. **Tests de integración:** Validar que los tipos coincidan en requests/responses
3. **Schema validation:** Usar JSON Schema en ambos lados
4. **Documentación centralizada:** Este archivo como fuente de verdad

---

## Mejoras Futuras

- **GraphQL Types:** Migrar a GraphQL con esquemas compartidos
- **Protobuf:** Para WebSocket events más eficientes
- **Code generation:** Auto-generar tipos desde OpenAPI spec
- **Migration scripts:** Scripts para sincronizar cambios de schema
- **Type guards:** Funciones de validación runtime en TypeScript
