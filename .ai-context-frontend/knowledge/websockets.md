# WebSockets (Laravel Reverb + Echo)

## Arquitectura WebSocket

```
┌──────────────────────────────────────┐
│   Laravel Backend                     │
│   ┌──────────────────────────────┐  │
│   │  Reverb Server               │  │
│   │  (WebSocket Server)          │  │
│   │  - Port: 443 (WSS)           │  │
│   │  - Same domain as API        │  │
│   └──────────────────────────────┘  │
└──────────────────────────────────────┘
              ↕ WSS://
┌──────────────────────────────────────┐
│   Vue 3 Frontend                     │
│   ┌──────────────────────────────┐  │
│   │  Laravel Echo                │  │
│   │  (WebSocket Client)          │  │
│   │  - Reconnection automática   │  │
│   │  - Channel management        │  │
│   └──────────────────────────────┘  │
└──────────────────────────────────────┘
```

## Laravel Reverb (Servidor)

### ¿Qué es Reverb?

Reverb es el servidor WebSocket **nativo de Laravel 12**, introducido para reemplazar la necesidad de servicios externos como Pusher o Ably.

**Características clave:**

- Vive **dentro** del contenedor de Laravel
- NO es un contenedor/servicio separado
- Se ejecuta con `php artisan reverb:start`
- Compatible con el protocolo de Laravel Echo

### Instalación

```bash
composer require laravel/reverb
php artisan reverb:install
```

### Configuración (.env)

```env
BROADCAST_DRIVER=reverb

REVERB_APP_ID=local
REVERB_APP_KEY=localkey
REVERB_APP_SECRET=localsecret
REVERB_HOST=api.tudominio.com
REVERB_PORT=443
REVERB_SCHEME=https
```

### Ejecución en Desarrollo

```bash
php artisan reverb:start
```

### Ejecución en Producción (Supervisor)

```ini
[program:reverb]
command=php artisan reverb:start --host=0.0.0.0 --port=8080
directory=/var/www/html
autostart=true
autorestart=true
stdout_logfile=/var/log/reverb.log
stderr_logfile=/var/log/reverb_error.log
```

### Dockerfile Integration

```dockerfile
FROM php:8.3-fpm

# ... instalación de dependencias

COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

CMD ["supervisord", "-n"]
```

## Laravel Echo (Cliente)

### ¿Qué es Echo?

Echo es el **cliente JavaScript** que conecta con servidores WebSocket de Laravel (Reverb, Pusher, Ably, etc.).

**Importante**:

- ✅ Con Reverb, SOLO necesitas `laravel-echo`
- ❌ NO necesitas `pusher-js`

### Instalación

```bash
npm install laravel-echo
```

**NO instalar**:

```bash
# ❌ Esto es SOLO para Pusher, no para Reverb
npm install pusher-js
```

### Configuración en Vue 3

#### echo.service.ts

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
      wsPort: Number(import.meta.env.VITE_REVERB_PORT) || 443,
      wssPort: Number(import.meta.env.VITE_REVERB_PORT) || 443,
      forceTLS: import.meta.env.VITE_REVERB_SCHEME === 'https',
      enabledTransports: ['ws', 'wss'],
    })
  }

  public channel(name: string) {
    return this.echo.channel(name)
  }

  public private(name: string) {
    return this.echo.private(name)
  }

  public leave(name: string) {
    this.echo.leave(name)
  }

  public disconnect() {
    this.echo.disconnect()
  }
}

export const echoService = new EchoService()
```

#### .env.production (Frontend)

```env
VITE_REVERB_APP_KEY=localkey
VITE_REVERB_HOST=api.tudominio.com
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=https
```

## Tipos de Canales

### 1. Canales Públicos

**Uso**: Información visible para todos.

**Backend** (routes/channels.php):

```php
Broadcast::channel('game.lobby', function ($user) {
    return true; // Público
});
```

**Frontend**:

```typescript
echoService.channel('game.lobby').listen('PlayerJoined', (e) => {
  console.log('Nuevo jugador:', e.player)
})
```

**Eventos típicos**:

- `PlayerJoined`
- `GameStarted`
- `ScreenChanged`

### 2. Canales Privados

**Uso**: Información solo para usuarios autenticados con permisos.

**Backend**:

```php
Broadcast::channel('game.{roomId}', function ($user, $roomId) {
    return $user->room_id === $roomId;
});
```

**Frontend**:

```typescript
echoService.private(`game.${roomId}`).listen('PlayerEliminated', (e) => {
  gameStore.updatePlayer(e.player)
})
```

**Autenticación requerida**: Laravel valida que el usuario tenga permiso.

### 3. Canales Presence

**Uso**: Saber quién está conectado en tiempo real.

**Backend**:

```php
Broadcast::channel('game.room.{roomId}', function ($user, $roomId) {
    if ($user->room_id === $roomId) {
        return ['id' => $user->id, 'name' => $user->nickname];
    }
});
```

**Frontend**:

```typescript
echoService
  .join(`game.room.${roomId}`)
  .here((users) => {
    console.log('Usuarios actuales:', users)
  })
  .joining((user) => {
    console.log('Usuario se unió:', user)
  })
  .leaving((user) => {
    console.log('Usuario se fue:', user)
  })
```

## Eventos Broadcast (Backend)

### Crear un Evento

```php
// app/Events/PlayerEliminated.php
namespace App\Events;

use App\Models\Player;
use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;

class PlayerEliminated implements ShouldBroadcast
{
    public function __construct(
        public Player $player
    ) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('game.show'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'PlayerEliminated';
    }

    public function broadcastWith(): array
    {
        return [
            'player_id' => $this->player->id,
            'nickname' => $this->player->nickname,
            'number' => $this->player->number,
            'eliminated_at' => $this->player->eliminated_at,
        ];
    }
}
```

### Disparar el Evento

```php
broadcast(new PlayerEliminated($player));
```

### Hacer Broadcast Condicional

```php
public function broadcastWhen(): bool
{
    return $this->player->status === PlayerStatus::ELIMINATED;
}
```

## Escuchar Eventos (Frontend)

### Patrón Básico

```typescript
// modules/games/millionaire/millionaire.socket.ts
import { echoService } from '@/modules/core/services/echo.service'
import { useMillionaireStore } from './millionaire.store'

export function useMillionaireSocket() {
  const store = useMillionaireStore()

  const channel = echoService.private('game.millionaire')

  channel.listen('QuestionReceived', (event) => {
    store.setQuestion(event.question)
    store.startCountdown(event.duration)
  })

  channel.listen('AnswerResult', (event) => {
    store.setResult(event.correct, event.player_id)
  })

  // Cleanup
  onUnmounted(() => {
    echoService.leave('game.millionaire')
  })

  return { channel }
}
```

### Uso en Componente

```vue
<script setup lang="ts">
import { useMillionaireSocket } from './millionaire.socket'

const { channel } = useMillionaireSocket()
</script>
```

## Catálogo de Eventos del Proyecto

### Eventos Globales (Canal: `game.show`)

| Evento             | Payload                                                | Descripción                 |
| ------------------ | ------------------------------------------------------ | --------------------------- |
| `PlayerJoined`     | `{ player }`                                           | Jugador entra al lobby      |
| `PlayerEliminated` | `{ player_id, nickname, number }`                      | Jugador eliminado           |
| `PlayerPassed`     | `{ player_id }`                                        | Jugador avanza de ronda     |
| `GameStarted`      | `{ game: 'millionaire', phase }`                       | Juego nuevo inicia          |
| `GameEnded`        | `{ game, winner_id? }`                                 | Juego termina               |
| `ScreenChanged`    | `{ type: 'passed'/'eliminated', player_id, duration }` | Pantalla transición         |
| `AudioRequested`   | `{ audio_url, volume, loop }`                          | Audio debe reproducirse     |
| `NumberCalled`     | `{ number, audio_url }`                                | Número de jugador anunciado |

### Eventos Millonario (Canal: `game.millionaire`)

| Evento             | Payload                           | Descripción                       |
| ------------------ | --------------------------------- | --------------------------------- |
| `QuestionReceived` | `{ question, answers, duration }` | Nueva pregunta                    |
| `AnswerResult`     | `{ player_id, correct }`          | Resultado de respuesta            |
| `CooldownStarted`  | `{ player_id, duration }`         | Cooldown por respuesta incorrecta |

### Eventos Rope (Canal: `game.rope.{groupId}`)

| Evento             | Payload                 | Descripción               |
| ------------------ | ----------------------- | ------------------------- |
| `RopeStateUpdated` | `{ tension, progress }` | Estado cuerda actualizado |
| `GroupEliminated`  | `{ group_id, players }` | Grupo eliminado           |

### Eventos Spell (Canal: `game.spell`)

| Evento           | Payload                   | Descripción            |
| ---------------- | ------------------------- | ---------------------- |
| `PlayerSelected` | `{ player_id, word }`     | Jugador debe deletrear |
| `AudioSubmitted` | `{ player_id, audio_id }` | Audio enviado          |
| `AudioValidated` | `{ player_id, approved }` | Supervisor validó      |

### Eventos Roulette (Canal: `game.roulette`)

| Evento           | Payload                       | Descripción         |
| ---------------- | ----------------------------- | ------------------- |
| `ScoreUpdated`   | `{ player_id, score, total }` | Puntaje actualizado |
| `WinnerDeclared` | `{ player }`                  | Ganador final       |

### Eventos Supervisor (Canal: `supervisor.show`)

| Evento              | Payload                      | Descripción                  |
| ------------------- | ---------------------------- | ---------------------------- |
| `SpellAudioPending` | `{ audio_id, player, word }` | Audio necesita revisión      |
| `StateSnapshot`     | `{ players, game, phase }`   | Snapshot completo del estado |

### Eventos Chat (Canal: `chat.show`)

| Evento            | Payload                             | Descripción        |
| ----------------- | ----------------------------------- | ------------------ |
| `ChatMessageSent` | `{ player_id, message, timestamp }` | Mensaje de chat    |
| `PlayerMuted`     | `{ player_id }`                     | Jugador silenciado |

### Eventos de Achievements

| Evento                | Payload                                                       | Descripción                  |
| --------------------- | ------------------------------------------------------------- | ---------------------------- |
| `AchievementUnlocked` | `{ player_id, achievement_id, name, description, timestamp }` | Logro desbloqueado           |
| `AchievementProgress` | `{ player_id, achievement_id, progress, target }`             | Progreso en logro progresivo |

### Eventos de Instrucciones

| Evento                  | Payload                                                         | Descripción                    |
| ----------------------- | --------------------------------------------------------------- | ------------------------------ |
| `InstructionsRequired`  | `{ session_id, game_type, slides, forced, version, timestamp }` | Instrucciones pre-juego        |
| `InstructionsCompleted` | `{ player_id, player_name, timestamp }`                         | Jugador completó instrucciones |

### Eventos de Audio/Música

| Evento          | Payload                                                | Descripción             |
| --------------- | ------------------------------------------------------ | ----------------------- |
| `TrackStarted`  | `{ track: AudioTrack, session_id, timestamp }`         | Pista de audio comenzó  |
| `TrackEnded`    | `{ track_id, session_id, played_duration, timestamp }` | Pista de audio terminó  |
| `VolumeChanged` | `{ type: AudioType, volume, timestamp }`               | Volumen de canal cambió |

### Eventos de Auditoría

| Evento            | Payload                                          | Descripción                 |
| ----------------- | ------------------------------------------------ | --------------------------- |
| `AuditLogCreated` | `{ type, action, user_id, metadata, timestamp }` | Nuevo registro de auditoría |

### Payloads Detallados

#### AchievementUnlocked

```typescript
interface AchievementUnlockedPayload {
  playerId: string
  achievementId: string
  achievement: {
    name: string
    description: string
    icon: string
    rarity: 'common' | 'rare' | 'epic' | 'legendary'
    points: number
  }
  sessionId: string
  roundId?: string
  timestamp: number
}
```

#### InstructionsRequired

```typescript
interface InstructionsRequiredPayload {
  sessionId: string
  gameType: 'millionaire' | 'rope' | 'spell' | 'roulette' | 'word-search' | 'flappy'
  slides: InstructionSlide[]
  forced: boolean // true si el supervisor forzó mostrar
  version: string // Para invalidar cache
  timestamp: number
}

interface InstructionSlide {
  title: string // i18n key
  description: string // i18n key
  items?: string[] // Lista de puntos
  tip?: string // Consejo opcional
  media?: {
    type: 'image' | 'gif' | 'video'
    url: string
  }
}
```

#### TrackStarted

```typescript
interface TrackStartedPayload {
  track: {
    id: string
    name: string
    artist?: string
    type: 'soundtrack' | 'effect' | 'voice' | 'ambience'
    url: string
    artwork?: string
    duration: number // segundos
    volume: number // 0.0 - 1.0
  }
  sessionId: string
  timestamp: number
}
```

#### AuditLogCreated

```typescript
interface AuditLogCreatedPayload {
  type: 'game' | 'player' | 'supervisor' | 'system'
  action: string // 'player_eliminated', 'achievement_unlocked', etc.
  userId?: string
  sessionId?: string
  metadata: Record<string, any>
  timestamp: number
}
```

## Autenticación de Canales

### Backend (routes/channels.php)

```php
use App\Models\Player;

// Canal público
Broadcast::channel('game.lobby', fn() => true);

// Canal privado (solo jugadores vivos)
Broadcast::channel('game.show', function (Player $user) {
    return $user->status === 'alive';
});

// Canal de grupo específico
Broadcast::channel('game.rope.{groupId}', function (Player $user, $groupId) {
    return $user->group_id === (int) $groupId;
});

// Canal supervisor
Broadcast::channel('supervisor.show', function (Player $user) {
    return $user->role === 'supervisor';
});
```

### Frontend Authentication

Echo automáticamente envía el token de autenticación cuando conecta a canales privados:

```typescript
// En axios.ts
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

// Echo lo usa automáticamente
echoService.private('game.show') // Envía token
```

## Reconexión Automática

Echo maneja reconexión automáticamente:

```typescript
echoService
  .channel('game.show')
  .subscribed(() => {
    console.log('Conectado')
  })
  .error((error) => {
    console.error('Error de conexión:', error)
  })
```

### Detectar Estado de Conexión

```typescript
// Composable para detectar conexión
export function useConnectionStatus() {
  const isConnected = ref(true)

  // Echo no expone estado directamente, usar eventos
  window.Echo.connector.socket.on('connect', () => {
    isConnected.value = true
  })

  window.Echo.connector.socket.on('disconnect', () => {
    isConnected.value = false
  })

  return { isConnected }
}
```

## Debugging

### Laravel

```bash
# Ver logs de Reverb
tail -f storage/logs/laravel.log

# Ver conexiones activas
php artisan reverb:stats
```

### Vue DevTools

```typescript
// Agregar logging en echo.service.ts
this.echo.channel('game.show').listen('.player-eliminated', (e) => {
  console.log('[Echo] PlayerEliminated:', e)
})
```

## Performance y Optimización

### Throttling de Eventos

```php
// Backend: limitar frecuencia de broadcast
class RopeStateUpdated implements ShouldBroadcast
{
    public function broadcastWhen(): bool
    {
        // Solo broadcast cada 100ms
        return Cache::remember('rope.last-broadcast', 0.1, fn() => true);
    }
}
```

### Batching de Eventos

```php
// Agrupar múltiples eventos
broadcast(new PlayerEliminated($player1));
broadcast(new PlayerEliminated($player2));
// Reverb agrupa automáticamente
```

### Limpieza de Listeners

```typescript
onUnmounted(() => {
  echoService.leave('game.millionaire')
})
```

## Testing

### Testing Broadcast (Laravel)

```php
use Illuminate\Support\Facades\Event;

Event::fake();

$player = Player::factory()->create();
broadcast(new PlayerEliminated($player));

Event::assertDispatched(PlayerEliminated::class, function ($e) use ($player) {
    return $e->player->id === $player->id;
});
```

### Testing Echo (Vue)

```typescript
import { vi } from 'vitest'

const mockChannel = {
  listen: vi.fn(),
  stopListening: vi.fn(),
}

vi.mock('@/modules/core/services/echo.service', () => ({
  echoService: {
    private: vi.fn(() => mockChannel),
  },
}))
```

## Resumen

| Aspecto       | Detalle                            |
| ------------- | ---------------------------------- |
| Servidor      | Laravel Reverb (dentro de Laravel) |
| Cliente       | Laravel Echo                       |
| Protocolo     | WebSocket (WSS)                    |
| Puerto        | 443 (mismo que HTTPS)              |
| Dominio       | Mismo que API                      |
| Reconexión    | Automática                         |
| Autenticación | Token JWT/Sanctum                  |
| Canales       | Públicos, Privados, Presence       |
