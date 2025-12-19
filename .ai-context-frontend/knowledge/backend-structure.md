# Backend Structure (Laravel 12)

## Estructura de Carpetas Completa

```
app/
├── Actions/                        # Casos de uso (Command pattern)
│   ├── Player/
│   │   ├── AssignPlayerNumber.php
│   │   ├── GenerateReconnectCode.php
│   │   ├── ReconnectPlayer.php
│   │   └── EliminatePlayer.php
│   │
│   ├── Audio/
│   │   ├── PlaySystemAudio.php
│   │   └── PlayNumberAudio.php
│   │
│   ├── Screens/
│   │   ├── ShowPassedScreen.php
│   │   └── ShowEliminatedScreen.php
│   │
│   └── Games/
│       ├── Millionaire/
│       │   ├── StartMillionaire.php
│       │   ├── SubmitAnswer.php
│       │   └── EndMillionaire.php
│       ├── Rope/
│       ├── Spell/
│       └── Roulette/
│
├── Broadcasts/                     # Canales Reverb
│   ├── ShowChannel.php
│   ├── GameChannel.php
│   └── SupervisorChannel.php
│
├── Domain/                         # Lógica de dominio
│   ├── Player/
│   │   ├── Player.php              # Modelo de dominio
│   │   ├── PlayerStatus.php        # Enum
│   │   ├── PlayerRole.php          # Enum
│   │   └── PlayerRepository.php    # Interfaz
│   │
│   ├── Show/
│   │   ├── ShowState.php
│   │   ├── ShowMachine.php         # 👈 State machine
│   │   ├── ShowPhase.php           # Enum
│   │   └── GameType.php            # Enum
│   │
│   ├── Audio/
│   │   ├── SystemAudio.php
│   │   ├── NumberAudio.php
│   │   ├── SpellAudio.php
│   │   └── AudioContext.php        # Enum
│   │
│   └── Screen/
│       ├── ScreenType.php          # Enum: passed, eliminated
│       └── ScreenPayload.php
│
├── Events/                         # Eventos de dominio (Broadcast)
│   ├── PlayerJoined.php
│   ├── PlayerReconnected.php
│   ├── PlayerEliminated.php
│   ├── PlayerPassed.php
│   ├── GameStarted.php
│   ├── GameEnded.php
│   ├── ScreenChanged.php
│   ├── AudioRequested.php
│   ├── NumberCalled.php
│   ├── SpellAudioSubmitted.php
│   └── SpellAudioReviewed.php
│
├── Http/
│   ├── Controllers/
│   │   ├── AuthController.php
│   │   ├── PlayerController.php
│   │   ├── SupervisorController.php
│   │   ├── AudioController.php
│   │   └── Games/
│   │       ├── MillionaireController.php
│   │       ├── RopeController.php
│   │       ├── SpellController.php
│   │       └── RouletteController.php
│   │
│   ├── Middleware/
│   │   ├── RoleMiddleware.php
│   │   └── PlayerAliveMiddleware.php
│   │
│   └── Requests/
│       ├── JoinGameRequest.php
│       └── ReconnectRequest.php
│
├── Jobs/                           # Trabajos asíncronos
│   ├── GenerateSystemAudio.php
│   ├── GenerateNumberAudios.php
│   ├── StoreSpellAudio.php
│   └── ProcessElimination.php
│
├── Models/                         # Eloquent Models
│   ├── Player.php
│   ├── Show.php
│   ├── SystemAudio.php
│   ├── NumberAudio.php
│   └── SpellAudio.php
│
├── Policies/                       # Autorización
│   ├── PlayerPolicy.php
│   └── AudioPolicy.php
│
├── Services/                       # Servicios de aplicación
│   ├── Audio/
│   │   ├── ElevenLabsService.php
│   │   ├── AudioStorageService.php
│   │   ├── AudioRegistryService.php
│   │   └── AudioDispatcher.php
│   │
│   ├── Player/
│   │   ├── ReconnectionService.php
│   │   └── NumberAssignmentService.php
│   │
│   ├── Game/
│   │   ├── EliminationService.php
│   │   └── GroupingService.php      # Para La Cuerda
│   │
│   └── Show/
│       └── ShowOrchestrator.php     # Orquesta state machine
│
└── Support/                        # Helpers y utilidades
    ├── Random.php
    └── CooldownManager.php

database/
├── migrations/
│   ├── 2024_01_01_create_players_table.php
│   ├── 2024_01_02_create_shows_table.php
│   ├── 2024_01_03_create_system_audios_table.php
│   ├── 2024_01_04_create_number_audios_table.php
│   └── 2024_01_05_create_spell_audios_table.php
│
├── seeders/
│   ├── SystemAudioSeeder.php       # Diálogos del sistema
│   ├── NumberAudioSeeder.php       # Números 1-50
│   └── DatabaseSeeder.php
│
└── factories/
    └── PlayerFactory.php

routes/
├── api.php                         # Rutas API REST
├── channels.php                    # Canales Reverb (broadcast)
└── supervisor.php                  # Rutas específicas supervisor

config/
├── broadcasting.php                # Configuración Reverb
├── filesystems.php                 # RustFS S3
└── services.php                    # ElevenLabs, etc.

storage/
└── app/
    └── audios/                     # Temporal (luego → S3)
```

## Convenciones de Nomenclatura

### Clases

- **PascalCase**: `PlayerController`, `ElevenLabsService`
- **Sufijos**:
  - `Controller`: Controladores HTTP
  - `Service`: Servicios de aplicación
  - `Action`: Casos de uso
  - `Event`: Eventos
  - `Job`: Trabajos en cola
  - `Policy`: Políticas de autorización

### Métodos

- **camelCase**: `assignNumber()`, `eliminatePlayer()`
- **Verbos**: `create`, `update`, `delete`, `process`, `handle`

### Rutas API

```php
// api.php
Route::post('/player/join', [PlayerController::class, 'join']);
Route::post('/player/reconnect', [PlayerController::class, 'reconnect']);
Route::get('/player/{id}/stat-card', [PlayerController::class, 'statCard']);
```

### Canales Broadcast

```php
// channels.php
Broadcast::channel('game.show', fn($user) => $user->role === 'player');
Broadcast::channel('supervisor.show', fn($user) => $user->role === 'supervisor');
Broadcast::channel('game.{roomId}', fn($user, $roomId) => $user->room_id === $roomId);
```

## Responsabilidades por Carpeta

### `/Actions/`

**Propósito**: Casos de uso (lógica de aplicación).

**Características**:

- Una acción = un caso de uso
- Método `handle()` principal
- Dispatcha eventos
- Usa servicios

**Ejemplo**:

```php
class EliminatePlayer
{
    public function handle(Player $player): void
    {
        $player->status = PlayerStatus::ELIMINATED;
        $player->eliminated_at = now();
        $player->save();

        event(new PlayerEliminated($player));
    }
}
```

### `/Domain/`

**Propósito**: Lógica de negocio pura (sin Laravel).

**Características**:

- No depende de Eloquent
- No depende de Request/Response
- Solo lógica de dominio

**Ejemplo**:

```php
enum PlayerStatus: string
{
    case ALIVE = 'alive';
    case ELIMINATED = 'eliminated';
}

class ShowMachine
{
    public function transition(ShowPhase $from, ShowPhase $to): bool
    {
        return match([$from, $to]) {
            [ShowPhase::LOBBY, ShowPhase::MILLIONAIRE] => true,
            [ShowPhase::MILLIONAIRE, ShowPhase::SPELL] => true,
            // ...
            default => false,
        };
    }
}
```

### `/Events/`

**Propósito**: Eventos que se emiten por Reverb.

**Características**:

- Implementan `ShouldBroadcast`
- Contienen datos públicos
- Se emiten con `broadcast()`

**Ejemplo**:

```php
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
}
```

### `/Services/`

**Propósito**: Lógica de infraestructura y servicios externos.

**Características**:

- Interactúan con APIs externas
- Gestión de archivos
- Caché
- Algoritmos complejos

**Ejemplo**:

```php
class ElevenLabsService
{
    public function generate(string $text): array
    {
        $response = Http::withHeaders([
            'xi-api-key' => config('services.elevenlabs.key'),
        ])->post('https://api.elevenlabs.io/v1/text-to-speech/VOICE_ID', [
            'text' => $text,
            'voice_settings' => [
                'stability' => 0.35,
                'similarity_boost' => 0.85,
            ]
        ]);

        return [
            'key' => Str::uuid() . '.mp3',
            'binary' => $response->body(),
        ];
    }
}
```

### `/Jobs/`

**Propósito**: Trabajos que se ejecutan en background.

**Ejemplo**:

```php
class GenerateNumberAudios implements ShouldQueue
{
    public function handle(ElevenLabsService $service): void
    {
        for ($i = 1; $i <= 50; $i++) {
            $text = "Jugador número {$i}";
            $audio = $service->generate($text);

            Storage::disk('rustfs')->put($audio['key'], $audio['binary']);

            NumberAudio::create([
                'number' => $i,
                's3_key' => $audio['key'],
            ]);
        }
    }
}
```

## Patrones Principales

### Action Pattern (Casos de Uso)

```php
// En Controller
public function eliminate(Player $player)
{
    app(EliminatePlayer::class)->handle($player);
    return response()->json(['success' => true]);
}
```

### Service Pattern

```php
// Singleton en Service Provider
$this->app->singleton(ElevenLabsService::class);

// Uso con inyección de dependencias
public function __construct(
    private ElevenLabsService $elevenlabs
) {}
```

### Repository Pattern (Opcional)

```php
interface PlayerRepository
{
    public function findAlive(): Collection;
    public function findByNumber(int $number): ?Player;
}

class EloquentPlayerRepository implements PlayerRepository
{
    public function findAlive(): Collection
    {
        return Player::where('status', PlayerStatus::ALIVE)->get();
    }
}
```

### State Machine Pattern

```php
class ShowMachine
{
    private ShowPhase $currentPhase = ShowPhase::LOBBY;

    public function next(): ShowPhase
    {
        $this->currentPhase = match($this->currentPhase) {
            ShowPhase::LOBBY => ShowPhase::MILLIONAIRE,
            ShowPhase::MILLIONAIRE => ShowPhase::SPELL,
            ShowPhase::SPELL => ShowPhase::ROPE,
            ShowPhase::ROPE => ShowPhase::MILLIONAIRE,
            // ...
        };

        event(new GameStarted($this->currentPhase));
        return $this->currentPhase;
    }
}
```

## Migraciones Clave

### Players Table

```php
Schema::create('players', function (Blueprint $table) {
    $table->id();
    $table->string('nickname');
    $table->string('gender')->nullable();
    $table->string('color');
    $table->unsignedTinyInteger('number')->unique();  // 1-50
    $table->string('code', 4);                        // PIN
    $table->enum('status', ['alive', 'eliminated']);
    $table->enum('role', ['player', 'supervisor']);
    $table->timestamps();
    $table->timestamp('eliminated_at')->nullable();
    $table->softDeletes();
});
```

### System Audios Table

```php
Schema::create('system_audios', function (Blueprint $table) {
    $table->id();
    $table->string('context');           // eliminated, passed, intro, etc.
    $table->text('text');
    $table->string('s3_key');
    $table->string('locale')->default('es-CO');
    $table->boolean('reusable')->default(true);
    $table->timestamps();
});
```

### Number Audios Table

```php
Schema::create('number_audios', function (Blueprint $table) {
    $table->id();
    $table->unsignedTinyInteger('number')->unique();  // 1-50
    $table->string('s3_key');
    $table->string('locale')->default('es-CO');
    $table->timestamps();
});
```

### Spell Audios Table

```php
Schema::create('spell_audios', function (Blueprint $table) {
    $table->id();
    $table->foreignId('player_id')->constrained();
    $table->string('word');
    $table->string('s3_key');
    $table->enum('status', ['pending', 'approved', 'rejected']);
    $table->foreignId('supervisor_id')->nullable()->constrained('players');
    $table->timestamps();
});
```

## Configuración Reverb

### config/broadcasting.php

```php
'reverb' => [
    'driver' => 'reverb',
    'app_id' => env('REVERB_APP_ID'),
    'key' => env('REVERB_APP_KEY'),
    'secret' => env('REVERB_APP_SECRET'),
    'host' => env('REVERB_HOST'),
    'port' => env('REVERB_PORT', 443),
    'scheme' => env('REVERB_SCHEME', 'https'),
],
```

### .env

```env
BROADCAST_DRIVER=reverb

REVERB_APP_ID=local
REVERB_APP_KEY=localkey
REVERB_APP_SECRET=localsecret
REVERB_HOST=api.tudominio.com
REVERB_PORT=443
REVERB_SCHEME=https
```

## Configuración RustFS (S3)

### config/filesystems.php

```php
'rustfs' => [
    'driver' => 's3',
    'key' => env('RUSTFS_KEY'),
    'secret' => env('RUSTFS_SECRET'),
    'region' => env('RUSTFS_REGION'),
    'bucket' => env('RUSTFS_BUCKET'),
    'endpoint' => env('RUSTFS_ENDPOINT'),
    'use_path_style_endpoint' => true,
],
```

## Seeders

### SystemAudioSeeder

```php
public function run(): void
{
    $dialogs = [
        'eliminated' => [
            'Has sido eliminado.',
            'Jugador eliminado.',
        ],
        'passed' => [
            'Avanzas a la siguiente ronda.',
        ],
        // ...
    ];

    foreach ($dialogs as $context => $texts) {
        foreach ($texts as $text) {
            $audio = app(ElevenLabsService::class)->generate($text);
            Storage::disk('rustfs')->put($audio['key'], $audio['binary']);

            SystemAudio::create([
                'context' => $context,
                'text' => $text,
                's3_key' => $audio['key'],
            ]);
        }
    }
}
```

### NumberAudioSeeder

```php
public function run(): void
{
    for ($i = 1; $i <= 50; $i++) {
        $text = "Jugador número {$i}";
        $audio = app(ElevenLabsService::class)->generate($text);
        Storage::disk('rustfs')->put($audio['key'], $audio['binary']);

        NumberAudio::create([
            'number' => $i,
            's3_key' => $audio['key'],
        ]);
    }
}
```

## Supervisor en Docker

### supervisord.conf

```ini
[supervisord]
nodaemon=true

[program:php-fpm]
command=php-fpm
autostart=true
autorestart=true
priority=10

[program:reverb]
command=php artisan reverb:start
directory=/var/www/html
autostart=true
autorestart=true
priority=20
```

## Resumen de Decisiones

| Aspecto      | Decisión             | Razón            |
| ------------ | -------------------- | ---------------- |
| Arquitectura | Domain-Driven Design | Escalabilidad    |
| Eventos      | Broadcast (Reverb)   | Tiempo real      |
| Audios       | Job + S3             | Performance      |
| State        | ShowMachine          | Mantenibilidad   |
| DB           | Eloquent             | Estándar Laravel |
| Reverb       | Supervisor           | Estabilidad      |
