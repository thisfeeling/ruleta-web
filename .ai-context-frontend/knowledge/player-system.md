# Player System

## Ciclo de Vida del Jugador

```
1. Registro → 2. Asignación → 3. Juego → 4. Eliminación/Victoria → 5. Espectador/Salida
```

## 1. Registro (Lobby)

### Input del Jugador

- **Nickname**: Texto libre (máx 20 caracteres)
- **Gender**: Opcional (para personalización futura)
- **Color**: Selector de colores predefinidos

### Asignación Automática del Sistema

```php
// Laravel
$player = Player::create([
    'nickname' => $request->nickname,
    'gender' => $request->gender,
    'color' => $request->color,
    'number' => $this->assignUniqueNumber(),  // 1-50, único
    'code' => $this->generatePIN(),            // 0000-9999
    'status' => PlayerStatus::ALIVE,
    'role' => PlayerRole::PLAYER,
]);

broadcast(new PlayerJoined($player));
```

### Generación de Número

```php
// app/Services/Player/NumberAssignmentService.php
public function assignUniqueNumber(): int
{
    $usedNumbers = Player::where('status', 'alive')
        ->pluck('number')
        ->toArray();

    $availableNumbers = array_diff(range(1, 50), $usedNumbers);

    if (empty($availableNumbers)) {
        throw new \Exception('No available numbers');
    }

    return $availableNumbers[array_rand($availableNumbers)];
}
```

### Generación de PIN

```php
public function generatePIN(): string
{
    do {
        $pin = str_pad(random_int(0, 9999), 4, '0', STR_PAD_LEFT);
    } while (Player::where('code', $pin)->exists());

    return $pin;
}
```

## 2. Stat Card (Información Pública)

### Modelo de Datos

```typescript
// Frontend
interface Player {
  id: number
  nickname: string
  gender: string | null
  color: string // hex: #FF5733
  number: number // 1-50
  status: 'alive' | 'eliminated'
  role: 'player' | 'supervisor'
  created_at: string // ISO date
  eliminated_at: string | null
  // code: NO se expone al frontend público
}
```

### Componente Stat Card

```vue
<!-- modules/player/PlayerCard.vue -->
<template>
  <div class="player-card" :style="{ borderColor: player.color }">
    <!-- Player Number as Icon (REFACTOR) -->
    <div class="player-number-icon" :style="{ backgroundColor: '#6b7280', color: '#ffffff' }">
      {{ player.number }}
    </div>

    <div class="player-nickname">{{ player.nickname }}</div>
    <div class="player-status" :class="statusClass">
      {{ statusText }}
    </div>
    <div class="player-time">
      {{
        player.status === 'eliminated'
          ? `Eliminado: ${formatTime(player.eliminated_at)}`
          : `Activo desde: ${formatTime(player.created_at)}`
      }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Player } from '@/modules/player/player.types'

const props = defineProps<{ player: Player }>()

const statusClass = computed(() => ({
  'status-alive': props.player.status === 'alive',
  'status-eliminated': props.player.status === 'eliminated',
}))

const statusText = computed(() => (props.player.status === 'alive' ? 'VIVO' : 'ELIMINADO'))

const formatTime = (date: string | null) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleTimeString('es-CO')
}
</script>

<style scoped>
.player-number-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  font-size: 1.5rem;
  font-weight: bold;
  /* Gray background (#6b7280 = gray-500) */
  /* White text (#ffffff) */
}
</style>
```

### Store de Jugadores

```typescript
// modules/player/player.store.ts
import { defineStore } from 'pinia'
import type { Player } from './player.types'

export const usePlayerStore = defineStore('player', {
  state: () => ({
    players: new Map<number, Player>(),
    currentPlayerId: null as number | null,
  }),

  getters: {
    alivePlayers: (state) => Array.from(state.players.values()).filter((p) => p.status === 'alive'),

    eliminatedPlayers: (state) =>
      Array.from(state.players.values()).filter((p) => p.status === 'eliminated'),

    currentPlayer: (state) =>
      state.currentPlayerId ? state.players.get(state.currentPlayerId) : null,

    playerByNumber: (state) => (number: number) =>
      Array.from(state.players.values()).find((p) => p.number === number),
  },

  actions: {
    addPlayer(player: Player) {
      this.players.set(player.id, player)
    },

    updatePlayer(player: Partial<Player> & { id: number }) {
      const existing = this.players.get(player.id)
      if (existing) {
        this.players.set(player.id, { ...existing, ...player })
      }
    },

    eliminatePlayer(playerId: number) {
      const player = this.players.get(playerId)
      if (player) {
        player.status = 'eliminated'
        player.eliminated_at = new Date().toISOString()
      }
    },

    setCurrentPlayer(playerId: number) {
      this.currentPlayerId = playerId
    },
  },
})
```

## 3. Sistema de Reconexión

### Escenario: Jugador Pierde Conexión

```
1. Desconexión detectada
2. Echo intenta reconexión automática
3. Si falla, muestra pantalla "Reconectar"
4. Lista jugadores en sala (number + nickname)
5. Jugador selecciona el suyo
6. Ingresa PIN de 4 dígitos
7. Laravel valida
8. Restaura sesión
```

### Backend: Endpoint de Reconexión

```php
// app/Http/Controllers/PlayerController.php
public function reconnect(Request $request)
{
    $request->validate([
        'number' => 'required|integer|between:1,50',
        'nickname' => 'required|string',
        'code' => 'required|string|size:4',
    ]);

    $player = Player::where('number', $request->number)
        ->where('nickname', $request->nickname)
        ->where('code', $request->code)
        ->first();

    if (!$player) {
        return response()->json([
            'error' => 'Jugador no encontrado o PIN incorrecto'
        ], 404);
    }

    // Generar nuevo token de autenticación
    $token = $player->createToken('game-session')->plainTextToken;

    // Broadcast reconexión
    broadcast(new PlayerReconnected($player));

    return response()->json([
        'player' => $player,
        'token' => $token,
        'game_state' => $this->getCurrentGameState(),
    ]);
}
```

### Frontend: Pantalla de Reconexión

```vue
<!-- modules/player/ReconnectView.vue -->
<template>
  <div class="reconnect-screen">
    <h1>Reconectar al Juego</h1>

    <div v-if="players.length === 0" class="loading">Cargando jugadores...</div>

    <div v-else class="player-selection">
      <h2>Selecciona tu jugador:</h2>
      <div class="player-list">
        <button
          v-for="player in players"
          :key="player.id"
          @click="selectPlayer(player)"
          class="player-option"
        >
          <span class="player-number">{{ player.number }}</span>
          <span class="player-nickname">{{ player.nickname }}</span>
        </button>
      </div>
    </div>

    <div v-if="selectedPlayer" class="pin-input">
      <h3>Ingresa tu PIN de 4 dígitos:</h3>
      <input
        v-model="pin"
        type="password"
        maxlength="4"
        pattern="[0-9]*"
        inputmode="numeric"
        placeholder="0000"
        @input="validatePin"
      />
      <button @click="reconnect" :disabled="!isPinValid">Reconectar</button>
    </div>

    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { apiService } from '@/modules/core/services/api.service'
import { useRouter } from 'vue-router'
import type { Player } from './player.types'

const router = useRouter()
const players = ref<Player[]>([])
const selectedPlayer = ref<Player | null>(null)
const pin = ref('')
const error = ref('')

const isPinValid = computed(() => /^\d{4}$/.test(pin.value))

const loadPlayers = async () => {
  const response = await apiService.get('/players/in-game')
  players.value = response.data
}

const selectPlayer = (player: Player) => {
  selectedPlayer.value = player
  pin.value = ''
  error.value = ''
}

const validatePin = (e: Event) => {
  const input = e.target as HTMLInputElement
  input.value = input.value.replace(/\D/g, '').slice(0, 4)
  pin.value = input.value
}

const reconnect = async () => {
  if (!selectedPlayer.value || !isPinValid.value) return

  try {
    const response = await apiService.post('/player/reconnect', {
      number: selectedPlayer.value.number,
      nickname: selectedPlayer.value.nickname,
      code: pin.value,
    })

    // Guardar token
    localStorage.setItem('auth_token', response.data.token)
    localStorage.setItem('player_id', response.data.player.id)

    // Navegar según estado
    if (response.data.player.status === 'alive') {
      router.push('/game')
    } else {
      router.push('/spectator')
    }
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Error de reconexión'
  }
}

loadPlayers()
</script>
```

## 4. Roles

### Player (Jugador Normal)

**Permisos**:

- ✅ Jugar en juegos activos
- ✅ Ver su stat card
- ✅ Chatear (si no está silenciado)
- ✅ Reconectarse con PIN
- ❌ Ver audios de otros jugadores (Deletréalo)
- ❌ Validar jugadas
- ❌ Pausar juego

### Supervisor (Espectador con Permisos)

**Permisos**:

- ✅ Ver TODO en tiempo real
- ✅ Validar audios de Deletréalo
- ✅ Silenciar jugadores en chat
- ✅ Ver dashboard completo
- ✅ Pausar/reanudar juego (opcional)
- ❌ Jugar
- ❌ Ser eliminado

### Backend: Middleware de Roles

```php
// app/Http/Middleware/RoleMiddleware.php
public function handle(Request $request, Closure $next, string $role)
{
    if ($request->user()->role !== $role) {
        return response()->json(['error' => 'Unauthorized'], 403);
    }

    return $next($request);
}
```

### Uso en Rutas

```php
// routes/api.php
Route::middleware(['auth', 'role:player'])->group(function () {
    Route::post('/game/action', [GameController::class, 'action']);
});

Route::middleware(['auth', 'role:supervisor'])->group(function () {
    Route::post('/spell/validate', [SpellController::class, 'validate']);
    Route::post('/chat/mute', [ChatController::class, 'mute']);
});
```

## 5. Modo Espectador (Eliminados)

### Cuando un Jugador es Eliminado

```php
// app/Actions/Player/EliminatePlayer.php
public function handle(Player $player): void
{
    $player->update([
        'status' => PlayerStatus::ELIMINATED,
        'eliminated_at' => now(),
    ]);

    broadcast(new PlayerEliminated($player));
    broadcast(new ScreenChanged('eliminated', $player->id));
}
```

### Frontend: Transición a Espectador

```typescript
// game.socket.ts
channel.listen('PlayerEliminated', (event) => {
  const playerStore = usePlayerStore()
  playerStore.eliminatePlayer(event.player_id)

  // Si es el jugador actual
  if (event.player_id === playerStore.currentPlayer?.id) {
    router.push('/spectator')
  }
})
```

### Vista Espectador

```vue
<!-- views/SpectatorView.vue -->
<template>
  <div class="spectator-view">
    <div class="spectator-banner">
      <h1>Fuiste eliminado</h1>
      <p>Puedes seguir viendo el juego</p>
    </div>

    <!-- Mismo GameView pero sin controles -->
    <GameView :spectator-mode="true" />

    <!-- Stats de todos los jugadores -->
    <PlayerList :show-all="true" />

    <!-- Chat (solo lectura o permitido) -->
    <ChatBox :read-only="false" />
  </div>
</template>
```

## 6. LocalStorage (Persistencia)

### Datos Guardados

```typescript
// modules/core/services/storage.service.ts
class StorageService {
  // Token de autenticación
  setAuthToken(token: string) {
    localStorage.setItem('auth_token', token)
  }

  getAuthToken(): string | null {
    return localStorage.getItem('auth_token')
  }

  // ID del jugador actual
  setPlayerId(id: number) {
    localStorage.setItem('player_id', String(id))
  }

  getPlayerId(): number | null {
    const id = localStorage.getItem('player_id')
    return id ? Number(id) : null
  }

  // PIN (opcional, solo para desarrollo)
  // ⚠️ NO guardar PIN en producción (seguridad)

  clearSession() {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('player_id')
  }
}

export const storageService = new StorageService()
```

## Resumen de Flujo Completo

```
1. Jugador entra → nickname + color
2. Sistema asigna → number (1-50) + PIN (0000-9999)
3. Broadcast → PlayerJoined
4. Juega → acciones validadas por Laravel
5. Pierde conexión → reconexión con number + nickname + PIN
6. Eliminado → modo espectador automático
7. Sale → puede volver con PIN si el juego sigue
```

## Testing

### Backend

```php
public function test_assigns_unique_number_and_pin()
{
    $player = Player::factory()->create();

    $this->assertNotNull($player->number);
    $this->assertBetween($player->number, 1, 50);
    $this->assertEquals(4, strlen($player->code));
}

public function test_reconnect_with_valid_pin()
{
    $player = Player::factory()->create(['code' => '1234']);

    $response = $this->postJson('/api/player/reconnect', [
        'number' => $player->number,
        'nickname' => $player->nickname,
        'code' => '1234',
    ]);

    $response->assertOk();
    $response->assertJsonStructure(['player', 'token']);
}
```

### Frontend

```typescript
import { describe, it, expect } from 'vitest'
import { usePlayerStore } from './player.store'

describe('PlayerStore', () => {
  it('eliminates player correctly', () => {
    const store = usePlayerStore()
    const player = { id: 1, status: 'alive', ... }

    store.addPlayer(player)
    store.eliminatePlayer(1)

    expect(store.players.get(1)?.status).toBe('eliminated')
  })
})
```
