# Audio System

## Arquitectura General

```
┌─────────────────────────────────────────┐
│  Laravel (Backend)                       │
│  ├─ ElevenLabs API (generación)         │
│  ├─ RustFS S3 (almacenamiento)          │
│  ├─ Database (metadatos)                │
│  └─ Reverb (broadcast URL)              │
└─────────────────────────────────────────┘
                ↓ WebSocket
┌─────────────────────────────────────────┐
│  Vue 3 (Frontend)                       │
│  ├─ AudioService (reproducción)         │
│  └─ Three.js (sincronización opcional)  │
└─────────────────────────────────────────┘
```

## Principios Fundamentales

### ✅ Reglas Obligatorias

1. **ElevenLabs SOLO en backend**: Nunca exponer API key al cliente
2. **Audios cacheados en S3**: Reutilización, no regeneración
3. **Seeders para audios base**: Números 1-50 y diálogos del sistema
4. **URLs firmadas**: Seguridad en acceso a S3
5. **Metadatos en BD**: Búsqueda y reutilización eficiente

## Tipos de Audio

### 1. Audios del Sistema (Narrador)

**Uso**: Voz del narrador para eventos del juego.

**Ejemplos**:

- "Bienvenidos al juego"
- "Jugador eliminado"
- "Avanzas a la siguiente ronda"
- "Prepárense para el siguiente juego"
- "Tenemos un ganador"

**Generación**: Una sola vez en seeder
**Almacenamiento**: S3 (RustFS)
**Base de datos**: `system_audios`

**Tabla**:

```sql
system_audios
- id
- context          // 'eliminated', 'passed', 'intro', 'countdown'
- text             // Texto original
- s3_key           // Ruta en S3
- locale           // 'es-CO' (español colombiano)
- reusable         // true
- created_at
- updated_at
```

### 2. Audios de Números (1-50)

**Uso**: Anunciar número de jugador.

**Ejemplos**:

- "Jugador número 1"
- "Jugador número 15"
- "Jugador número 50"

**Generación**: Una sola vez en seeder (50 audios)
**Reutilización**: 100% (números no cambian)

**Tabla**:

```sql
number_audios
- id
- number           // 1..50 (único)
- s3_key
- locale           // 'es-CO'
- created_at
- updated_at
```

### 3. Audios de Jugadores (Deletréalo)

**Uso**: Grabaciones de jugadores deletreando palabras.

**Flujo**:

1. Jugador graba audio en navegador
2. Se envía a Laravel
3. Laravel guarda en S3
4. Supervisor revisa y valida
5. Laravel decide eliminación

**Tabla**:

```sql
spell_audios
- id
- player_id
- word             // Palabra asignada
- s3_key
- status           // 'pending', 'approved', 'rejected'
- supervisor_id    // Quién validó
- created_at
- updated_at
```

## ElevenLabs Integration (Backend)

### SDK Installation (Node Worker)

```bash
npm install @elevenlabs/elevenlabs-js
npm install dotenv
```

### Service Implementation

```typescript
// audio-worker/generate.ts
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'
import fs from 'fs'
import 'dotenv/config'

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
})

export async function generateAudio(
  text: string,
  voiceId: string = 'JBFqnCBsd6RMkjVDRZzb', // Voz grave español
): Promise<string> {
  const audio = await client.textToSpeech.convert(voiceId, {
    text,
    model_id: 'eleven_multilingual_v2',
    output_format: 'mp3_44100_128',
  })

  const buffer = Buffer.from(await audio.arrayBuffer())
  const filename = `${Date.now()}_${Math.random()}.mp3`
  const path = `/tmp/${filename}`

  fs.writeFileSync(path, buffer)

  return path
}
```

### Laravel Service

```php
// app/Services/Audio/ElevenLabsService.php
namespace App\Services\Audio;

use Illuminate\Support\Facades\Process;

class ElevenLabsService
{
    public function generate(string $text): array
    {
        // Ejecutar worker Node.js
        $result = Process::path(base_path('audio-worker'))
            ->env(['ELEVENLABS_API_KEY' => config('services.elevenlabs.key')])
            ->run("node generate.js \"{$text}\"");

        if (!$result->successful()) {
            throw new \Exception('Failed to generate audio');
        }

        $audioPath = trim($result->output());

        return [
            'key' => basename($audioPath),
            'path' => $audioPath,
        ];
    }
}
```

## Seeders

### SystemAudioSeeder

```php
// database/seeders/SystemAudioSeeder.php
namespace Database\Seeders;

use App\Models\SystemAudio;
use App\Services\Audio\ElevenLabsService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

class SystemAudioSeeder extends Seeder
{
    public function run(): void
    {
        $dialogs = [
            'intro' => [
                'Bienvenidos al juego.',
                'Prepárense para comenzar.',
                'Que comience el show.',
            ],
            'eliminated' => [
                'Has sido eliminado.',
                'Jugador eliminado.',
                'Fin del juego para ti.',
                'Hasta aquí llegaste.',
            ],
            'passed' => [
                'Avanzas a la siguiente ronda.',
                'Sigues con vida.',
                'Sobreviviste.',
                'Pasaste la prueba.',
            ],
            'countdown' => [
                'Tres.',
                'Dos.',
                'Uno.',
                'Comienza.',
            ],
            'winner' => [
                'Tenemos un ganador.',
                'Victoria.',
                'Ganaste el juego.',
            ],
        ];

        $elevenlabs = app(ElevenLabsService::class);

        foreach ($dialogs as $context => $texts) {
            foreach ($texts as $text) {
                echo "Generating: {$text}\n";

                $audio = $elevenlabs->generate($text);
                $s3Key = "system-audios/{$context}/" . $audio['key'];

                Storage::disk('rustfs')->put(
                    $s3Key,
                    file_get_contents($audio['path'])
                );

                SystemAudio::create([
                    'context' => $context,
                    'text' => $text,
                    's3_key' => $s3Key,
                    'locale' => 'es-CO',
                    'reusable' => true,
                ]);

                unlink($audio['path']); // Limpiar temporal
            }
        }
    }
}
```

### NumberAudioSeeder

```php
// database/seeders/NumberAudioSeeder.php
namespace Database\Seeders;

use App\Models\NumberAudio;
use App\Services\Audio\ElevenLabsService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

class NumberAudioSeeder extends Seeder
{
    public function run(): void
    {
        $elevenlabs = app(ElevenLabsService::class);

        for ($i = 1; $i <= 50; $i++) {
            echo "Generating number: {$i}\n";

            $text = "Jugador número {$i}";
            $audio = $elevenlabs->generate($text);
            $s3Key = "number-audios/{$i}.mp3";

            Storage::disk('rustfs')->put(
                $s3Key,
                file_get_contents($audio['path'])
            );

            NumberAudio::create([
                'number' => $i,
                's3_key' => $s3Key,
                'locale' => 'es-CO',
            ]);

            unlink($audio['path']);
        }
    }
}
```

## Frontend: Production AudioService

### Asset Organization

```
src/assets/audio/
├── music/                          # Background music (long tracks)
│   ├── lobby.mp3                   # Lobby ambient music
│   ├── tension.mp3                 # Tense moments loop
│   ├── victory.mp3                 # Winner celebration
│   └── defeat.mp3                  # Elimination music
│
├── voices/                         # Narrador voices (from backend S3)
│   ├── round-start.mp3             # "Comienza la ronda"
│   ├── eliminated.mp3              # "Jugador eliminado"
│   ├── winner.mp3                  # "Tenemos un ganador"
│   └── countdown/
│       ├── 3.mp3
│       ├── 2.mp3
│       └── 1.mp3
│
└── sfx/                            # Sound effects (short)
    ├── ui/
    │   ├── click.mp3               # Button click
    │   ├── hover.mp3               # Button hover
    │   └── error.mp3               # Error feedback
    │
    ├── rope/
    │   ├── tension.mp3             # Rope tension sound
    │   └── snap.mp3                # Rope breaks
    │
    ├── bomb/
    │   ├── inflate.mp3             # Bomb inflating
    │   ├── tick.mp3                # Timer ticking
    │   └── explode.mp3             # Explosion
    │
    ├── roulette/
    │   ├── spin.mp3                # Wheel spinning
    │   └── stop.mp3                # Wheel stops
    │
    └── results/
        ├── win.mp3                 # Player passed
        ├── lose.mp3                # Player eliminated
        └── complete.mp3            # Task completed
```

### Complete Audio Service Implementation

```typescript
// modules/core/services/audio.service.ts

export type AudioChannel = 'music' | 'sfx' | 'voice'

export interface AudioConfig {
  volume?: number
  loop?: boolean
  channel?: AudioChannel
  fadeIn?: number
  fadeOut?: number
}

export interface AudioAsset {
  id: string
  url: string
  audio: HTMLAudioElement
  loaded: boolean
}

class AudioService {
  // Channel volumes (0-1)
  private volumes: Record<AudioChannel, number> = {
    music: 0.6,
    sfx: 0.8,
    voice: 1.0,
  }

  // Currently playing audios per channel
  private playing: Record<AudioChannel, HTMLAudioElement | null> = {
    music: null,
    sfx: null,
    voice: null,
  }

  // Preloaded assets
  private assets: Map<string, AudioAsset> = new Map()

  // Audio context for analysis
  private audioContext: AudioContext | null = null

  // Queue for sequential voice playback
  private voiceQueue: Array<() => Promise<void>> = []
  private isPlayingQueue: boolean = false

  // Master volume
  private masterVolume: number = 1.0
  private muted: boolean = false

  /**
   * Initialize audio service
   * Call on app start
   */
  public async initialize() {
    console.log('🔊 Initializing audio service...')

    // Preload critical SFX
    await this.preloadCriticalAssets()

    console.log('✅ Audio service ready')
  }

  /**
   * Preload critical audio files
   */
  private async preloadCriticalAssets() {
    const criticalAssets = [
      { id: 'ui-click', path: '/assets/audio/sfx/ui/click.mp3' },
      { id: 'ui-error', path: '/assets/audio/sfx/ui/error.mp3' },
      { id: 'bomb-tick', path: '/assets/audio/sfx/bomb/tick.mp3' },
      { id: 'bomb-explode', path: '/assets/audio/sfx/bomb/explode.mp3' },
      { id: 'results-win', path: '/assets/audio/sfx/results/win.mp3' },
      { id: 'results-lose', path: '/assets/audio/sfx/results/lose.mp3' },
    ]

    const promises = criticalAssets.map((asset) => this.preload(asset.id, asset.path))

    await Promise.allSettled(promises)
  }

  /**
   * Preload an audio file
   */
  public async preload(id: string, url: string): Promise<void> {
    if (this.assets.has(id)) {
      return
    }

    return new Promise((resolve, reject) => {
      const audio = new Audio(url)

      audio.addEventListener(
        'canplaythrough',
        () => {
          this.assets.set(id, {
            id,
            url,
            audio,
            loaded: true,
          })
          resolve()
        },
        { once: true },
      )

      audio.addEventListener(
        'error',
        (e) => {
          console.error(`Failed to preload audio: ${id}`, e)
          reject(e)
        },
        { once: true },
      )

      audio.load()
    })
  }

  /**
   * Play music (background, looping)
   */
  public async playMusic(urlOrId: string, config: AudioConfig = {}): Promise<HTMLAudioElement> {
    const channel: AudioChannel = 'music'
    const defaultConfig: AudioConfig = {
      volume: this.volumes.music,
      loop: true,
      channel,
      fadeIn: 1000,
      ...config,
    }

    // Stop current music with fade
    if (this.playing.music) {
      await this.fade(this.playing.music, defaultConfig.fadeOut || 1000)
    }

    const audio = await this.play(urlOrId, defaultConfig)
    this.playing.music = audio

    return audio
  }

  /**
   * Play sound effect (short, one-shot)
   */
  public async playSfx(urlOrId: string, config: AudioConfig = {}): Promise<HTMLAudioElement> {
    const defaultConfig: AudioConfig = {
      volume: this.volumes.sfx,
      loop: false,
      channel: 'sfx',
      ...config,
    }

    return this.play(urlOrId, defaultConfig)
  }

  /**
   * Play voice narration
   * Queues if another voice is playing
   */
  public async playVoice(urlOrId: string, config: AudioConfig = {}): Promise<HTMLAudioElement> {
    const defaultConfig: AudioConfig = {
      volume: this.volumes.voice,
      loop: false,
      channel: 'voice',
      ...config,
    }

    return new Promise((resolve, reject) => {
      const playTask = async () => {
        try {
          const audio = await this.play(urlOrId, defaultConfig)

          // Wait for voice to finish
          await new Promise<void>((res) => {
            audio.onended = () => res()
          })

          resolve(audio)
        } catch (error) {
          reject(error)
        }
      }

      // Add to queue
      this.voiceQueue.push(playTask)

      // Process queue if not already running
      if (!this.isPlayingQueue) {
        this.processVoiceQueue()
      }
    })
  }

  /**
   * Process voice queue sequentially
   */
  private async processVoiceQueue() {
    if (this.isPlayingQueue || this.voiceQueue.length === 0) {
      return
    }

    this.isPlayingQueue = true

    while (this.voiceQueue.length > 0) {
      const task = this.voiceQueue.shift()
      if (task) {
        await task()
      }
    }

    this.isPlayingQueue = false
  }

  /**
   * Core play method
   */
  private async play(urlOrId: string, config: AudioConfig): Promise<HTMLAudioElement> {
    // Check if preloaded
    let audio: HTMLAudioElement

    if (this.assets.has(urlOrId)) {
      // Clone preloaded audio
      const asset = this.assets.get(urlOrId)!
      audio = asset.audio.cloneNode() as HTMLAudioElement
    } else {
      // Create new audio element
      audio = new Audio(urlOrId)
    }

    // Apply config
    const finalVolume = (config.volume ?? 1.0) * this.masterVolume
    audio.volume = this.muted ? 0 : finalVolume
    audio.loop = config.loop ?? false

    // Store reference if channel specified
    if (config.channel) {
      this.playing[config.channel] = audio

      audio.onended = () => {
        if (this.playing[config.channel!] === audio) {
          this.playing[config.channel!] = null
        }
      }
    }

    // Fade in
    if (config.fadeIn && config.fadeIn > 0) {
      audio.volume = 0
      await audio.play()
      await this.fadeIn(audio, finalVolume, config.fadeIn)
    } else {
      await audio.play()
    }

    return audio
  }

  /**
   * Stop audio on specific channel
   */
  public stop(channel: AudioChannel): void {
    const audio = this.playing[channel]
    if (audio) {
      audio.pause()
      audio.currentTime = 0
      this.playing[channel] = null
    }
  }

  /**
   * Stop all audio
   */
  public stopAll(): void {
    Object.keys(this.playing).forEach((channel) => {
      this.stop(channel as AudioChannel)
    })

    // Clear voice queue
    this.voiceQueue = []
    this.isPlayingQueue = false
  }

  /**
   * Fade out audio
   */
  public async fade(audio: HTMLAudioElement, duration: number = 1000): Promise<void> {
    const startVolume = audio.volume
    const startTime = Date.now()

    return new Promise((resolve) => {
      const fadeInterval = setInterval(() => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)

        audio.volume = startVolume * (1 - progress)

        if (progress >= 1) {
          clearInterval(fadeInterval)
          audio.pause()
          resolve()
        }
      }, 50)
    })
  }

  /**
   * Fade in audio
   */
  private async fadeIn(
    audio: HTMLAudioElement,
    targetVolume: number,
    duration: number,
  ): Promise<void> {
    const startTime = Date.now()

    return new Promise((resolve) => {
      const fadeInterval = setInterval(() => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)

        audio.volume = targetVolume * progress

        if (progress >= 1) {
          clearInterval(fadeInterval)
          resolve()
        }
      }, 50)
    })
  }

  /**
   * Set volume for specific channel
   */
  public setChannelVolume(channel: AudioChannel, volume: number) {
    this.volumes[channel] = Math.max(0, Math.min(1, volume))

    // Update current playing audio
    const audio = this.playing[channel]
    if (audio && !this.muted) {
      audio.volume = this.volumes[channel] * this.masterVolume
    }
  }

  /**
   * Set master volume
   */
  public setMasterVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume))

    // Update all playing audios
    Object.entries(this.playing).forEach(([channel, audio]) => {
      if (audio && !this.muted) {
        audio.volume = this.volumes[channel as AudioChannel] * this.masterVolume
      }
    })
  }

  /**
   * Mute/unmute
   */
  public setMuted(muted: boolean) {
    this.muted = muted

    Object.entries(this.playing).forEach(([channel, audio]) => {
      if (audio) {
        audio.volume = muted ? 0 : this.volumes[channel as AudioChannel] * this.masterVolume
      }
    })
  }

  /**
   * Create audio analyzer for visualizations (Three.js)
   */
  public createAnalyzer(audio: HTMLAudioElement): AnalyserNode | null {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }

    try {
      const source = this.audioContext.createMediaElementSource(audio)
      const analyzer = this.audioContext.createAnalyser()

      analyzer.fftSize = 256
      analyzer.smoothingTimeConstant = 0.8

      source.connect(analyzer)
      analyzer.connect(this.audioContext.destination)

      return analyzer
    } catch (error) {
      console.error('Failed to create analyzer:', error)
      return null
    }
  }

  /**
   * Get current volumes
   */
  public getVolumes() {
    return {
      master: this.masterVolume,
      music: this.volumes.music,
      sfx: this.volumes.sfx,
      voice: this.volumes.voice,
      muted: this.muted,
    }
  }
}

// Singleton instance
export const audioService = new AudioService()

// Auto-initialize on module load
if (typeof window !== 'undefined') {
  audioService.initialize()
}
```

## Flujo Completo: Eliminación con Audio

```
1. Laravel decide eliminación
   └─> EliminationService::eliminate($player)

2. Laravel busca audio apropiado
   └─> SystemAudio::where('context', 'eliminated')->inRandomOrder()->first()

3. Laravel genera URL firmada
   └─> Storage::disk('rustfs')->temporaryUrl($s3Key, now()->addMinutes(5))

4. Laravel broadcast evento
   └─> broadcast(new PlayerEliminated($player, $audioUrl))

5. Vue recibe evento
   └─> gameStore.updatePlayer(event.player)

6. AudioService reproduce
   └─> audioService.play(event.audioUrl)

7. ScreenComponent muestra
   └─> <EliminatedScreen :player="event.player" />
```

## Composable for Games

```typescript
// modules/core/composables/useAudio.ts
import { audioService } from '@/modules/core/services/audio.service'
import { ref, onUnmounted } from 'vue'

export function useAudio() {
  const isPlaying = ref(false)
  const currentAudio = ref<HTMLAudioElement | null>(null)
  const audios = ref<HTMLAudioElement[]>([])

  const playMusic = async (urlOrId: string, volume = 0.6) => {
    try {
      isPlaying.value = true
      currentAudio.value = await audioService.playMusic(urlOrId, { volume })
      audios.value.push(currentAudio.value)

      currentAudio.value.onended = () => {
        isPlaying.value = false
      }

      return currentAudio.value
    } catch (error) {
      console.error('Error playing music:', error)
      isPlaying.value = false
    }
  }

  const playSfx = async (urlOrId: string, volume = 0.8) => {
    try {
      const audio = await audioService.playSfx(urlOrId, { volume })
      audios.value.push(audio)
      return audio
    } catch (error) {
      console.error('Error playing SFX:', error)
    }
  }

  const playVoice = async (urlOrId: string, volume = 1.0) => {
    try {
      const audio = await audioService.playVoice(urlOrId, { volume })
      audios.value.push(audio)
      return audio
    } catch (error) {
      console.error('Error playing voice:', error)
    }
  }

  const stop = (channel?: 'music' | 'sfx' | 'voice') => {
    if (channel) {
      audioService.stop(channel)
    } else {
      audioService.stopAll()
    }
    isPlaying.value = false
    currentAudio.value = null
  }

  const setVolume = (channel: 'music' | 'sfx' | 'voice', volume: number) => {
    audioService.setChannelVolume(channel, volume)
  }

  // Cleanup on unmount
  onUnmounted(() => {
    audios.value.forEach((audio) => {
      audio.pause()
      audio.src = ''
    })
    audios.value = []
  })

  return {
    isPlaying,
    currentAudio,
    playMusic,
    playSfx,
    playVoice,
    stop,
    setVolume,
  }
}
```

### Game-Specific Composable Example

```typescript
// modules/games/spell/spell.audio.ts
import { useAudio } from '@/modules/core/composables/useAudio'

export function useSpellAudio() {
  const { playSfx, playVoice } = useAudio()

  const playBombTick = () => playSfx('bomb-tick', 0.6)
  const playBombExplode = () => playSfx('bomb-explode', 1.0)
  const playBombInflate = () => playSfx('bomb/inflate', 0.4)

  const announcePlayer = (playerNumber: number) => {
    return playVoice(`/api/audio/numbers/${playerNumber}`)
  }

  const announceEliminated = () => {
    return playVoice('/api/audio/system/eliminated')
  }

  return {
    playBombTick,
    playBombExplode,
    playBombInflate,
    announcePlayer,
    announceEliminated,
  }
}
```

## Sincronización con Three.js

```typescript
// modules/games/rope/rope.visual.ts
import * as THREE from 'three'

export class RopeVisual {
  private analyzer: AnalyserNode | null = null

  public bindAudio(audio: HTMLAudioElement) {
    const listener = new THREE.AudioListener()
    const sound = new THREE.Audio(listener)

    sound.setMediaElementSource(audio)

    this.analyzer = new THREE.AudioAnalyser(sound, 32)
  }

  public update() {
    if (!this.analyzer) return

    const frequency = this.analyzer.getAverageFrequency()
    const intensity = frequency / 256

    // Usar intensidad para animar la cuerda
    this.rope.position.x = intensity * 2
  }
}
```

## Cost Management

### Caching Strategy

**Generar una sola vez**:

- ✅ Números 1-50 (50 audios)
- ✅ Diálogos del sistema (~20 audios)
- **Total seeders**: ~70 audios

**Generación en runtime**:

- ❌ Evitar a toda costa
- Solo casos especiales no predecibles

### Costo Estimado (ElevenLabs)

- Plan gratuito: 10,000 caracteres/mes
- Seeders: ~70 audios × ~20 caracteres = 1,400 caracteres
- **Una sola vez**: Costo insignificante

## Configuration

### .env (Laravel)

```env
ELEVENLABS_API_KEY=your_api_key_here
ELEVENLABS_VOICE_ID=JBFqnCBsd6RMkjVDRZzb
ELEVENLABS_MODEL=eleven_multilingual_v2

RUSTFS_KEY=...
RUSTFS_SECRET=...
RUSTFS_BUCKET=ruleta-audios
RUSTFS_REGION=us-east-1
RUSTFS_ENDPOINT=https://s3.your-provider.com
```

### config/services.php

```php
'elevenlabs' => [
    'key' => env('ELEVENLABS_API_KEY'),
    'voice_id' => env('ELEVENLABS_VOICE_ID'),
    'model' => env('ELEVENLABS_MODEL', 'eleven_multilingual_v2'),
],
```

## Testing

### Backend Test

```php
public function test_generates_audio_and_stores_in_s3()
{
    Storage::fake('rustfs');

    $service = app(ElevenLabsService::class);
    $audio = $service->generate('Test audio');

    Storage::disk('rustfs')->assertExists($audio['key']);
}
```

### Frontend Test

```typescript
import { describe, it, expect, vi } from 'vitest'
import { audioService } from './audio.service'

describe('AudioService', () => {
  it('plays audio from URL', async () => {
    const mockPlay = vi.fn()
    HTMLAudioElement.prototype.play = mockPlay

    await audioService.play('https://example.com/audio.mp3')

    expect(mockPlay).toHaveBeenCalled()
  })
})
```

## Integration Patterns

### Pattern 1: Game Event → Audio

Cada vez que ocurre un evento de juego, reproducir audio apropiado:

```typescript
// modules/games/millionaire/millionaire.socket.ts
import { useAudio } from '@/modules/core/composables/useAudio'
import { echoService } from '@/modules/core/services/echo.service'

export function useMillionaireSocket() {
  const { playVoice, playSfx } = useAudio()
  const channel = echoService.private('game.millionaire')

  // Nueva pregunta
  channel.listen('QuestionReceived', (event) => {
    playSfx('ui/question-appear')
    playVoice(event.questionAudioUrl) // Si hay narración
  })

  // Respuesta correcta
  channel.listen('AnswerCorrect', () => {
    playSfx('results/win')
  })

  // Respuesta incorrecta
  channel.listen('AnswerWrong', () => {
    playSfx('results/lose')
  })

  return { channel }
}
```

### Pattern 2: Backend Audio URLs via Reverb

El backend genera URLs firmadas y las envía via WebSocket:

```typescript
// Backend (Laravel)
event(new PlayerEliminated([
    'player_id' => $player->id,
    'nickname' => $player->nickname,
    'audio_url' => Storage::disk('rustfs')->temporaryUrl(
        $audio->s3_key,
        now()->addMinutes(5)
    )
]));

// Frontend (Vue)
channel.listen('PlayerEliminated', (event: {
  player_id: number
  nickname: string
  audio_url: string
}) => {
  // Reproducir audio del backend
  playVoice(event.audio_url)

  // Mostrar pantalla
  showEliminatedScreen(event.player_id)
})
```

### Pattern 3: Sequential Voice Queue

Múltiples voces se reproducen en orden sin solaparse:

```typescript
// Anunciar múltiples eliminaciones
async function announceEliminations(players: Player[]) {
  for (const player of players) {
    // Cada voz espera a que termine la anterior
    await playVoice(`/api/audio/numbers/${player.number}`)
    await new Promise((resolve) => setTimeout(resolve, 500)) // Pausa
    await playVoice('/api/audio/system/eliminated')
    await new Promise((resolve) => setTimeout(resolve, 1000)) // Pausa
  }
}
```

### Pattern 4: Background Music per Scene

Cada escena/juego tiene su música ambiente:

```vue
<!-- RopeScene.vue -->
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useAudio } from '@/modules/core/composables/useAudio'

const { playMusic, stop } = useAudio()

onMounted(() => {
  playMusic('/assets/audio/music/rope-tension.mp3', 0.5)
})

onUnmounted(() => {
  stop('music')
})
</script>
```

### Pattern 5: Audio + Three.js Sync

Sincronizar visuales 3D con audio:

```typescript
// modules/games/rope/rope.visual.ts
import * as THREE from 'three'
import { audioService } from '@/modules/core/services/audio.service'

export class RopeVisual {
  private analyzer: AnalyserNode | null = null
  private rope: THREE.Mesh

  public bindAudio(audio: HTMLAudioElement) {
    this.analyzer = audioService.createAnalyzer(audio)
  }

  public update() {
    if (!this.analyzer) return

    const dataArray = new Uint8Array(this.analyzer.frequencyBinCount)
    this.analyzer.getByteFrequencyData(dataArray)

    // Promedio de frecuencias
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length
    const intensity = average / 255

    // Animar cuerda según intensidad del audio
    this.rope.position.x = Math.sin(Date.now() * 0.001) * intensity * 2
    this.rope.rotation.z = intensity * 0.1
  }
}
```

### Pattern 6: Audio in Components (UI Feedback)

Feedback de UI con SFX:

```vue
<!-- ui/components/buttons/PrimaryButton.vue -->
<template>
  <button @click="handleClick" @mouseenter="handleHover" class="btn btn-primary">
    <slot />
  </button>
</template>

<script setup lang="ts">
import { useAudio } from '@/modules/core/composables/useAudio'

const { playSfx } = useAudio()

function handleClick() {
  playSfx('ui-click', 0.6)
}

function handleHover() {
  playSfx('ui/hover', 0.3)
}
</script>
```

### Pattern 7: Preloading Critical Assets

Precargar audios antes de iniciar juego:

```typescript
// modules/games/spell/SpellScene.vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { audioService } from '@/modules/core/services/audio.service'

onMounted(async () => {
  // Precargar SFX del juego antes de empezar
  await Promise.all([
    audioService.preload('bomb-tick', '/assets/audio/sfx/bomb/tick.mp3'),
    audioService.preload('bomb-explode', '/assets/audio/sfx/bomb/explode.mp3'),
    audioService.preload('bomb-inflate', '/assets/audio/sfx/bomb/inflate.mp3')
  ])

  console.log('✅ Spell audio assets preloaded')
})
</script>
```

---

## Best Practices

### ✅ DO

1. **Preload critical SFX** (click, tick, explode) on app init
2. **Use channels** (music, sfx, voice) for independent volume control
3. **Queue voice narration** to prevent overlapping
4. **Lazy load music** (only when needed per scene)
5. **Cleanup on unmount** (stop audio, clear references)
6. **Provide mute/volume controls** in settings
7. **Handle mobile autoplay restrictions** (require user interaction first)

### ❌ DON'T

1. **Don't generate audio on frontend** (backend only)
2. **Don't overlap voice narrations** (use queue)
3. **Don't forget to stop audio** on scene changes
4. **Don't hardcode volumes** (use channel system)
5. **Don't trust client-side audio timing** for game logic (server-authoritative)
6. **Don't preload all assets** (lazy load music)

---

## Mobile Considerations

### Autoplay Restrictions

Browsers bloquean autoplay hasta que haya interacción del usuario:

```typescript
// modules/core/services/audio.service.ts

public async unlockAudio() {
  // Llamar después del primer tap/click
  if (!this.audioContext) {
    this.audioContext = new AudioContext()
  }

  if (this.audioContext.state === 'suspended') {
    await this.audioContext.resume()
  }

  console.log('🔊 Audio unlocked')
}

// En app inicial
document.addEventListener('click', () => {
  audioService.unlockAudio()
}, { once: true })
```

### Performance

- ✅ MP3 a 44.1kHz, 128kbps (balance calidad/tamaño)
- ✅ Máximo 3-5 MB por track música
- ✅ SFX < 100KB cada uno
- ✅ Comprimir con FFmpeg antes de deploy

---

## Audio Settings UI

```vue
<!-- ui/components/modals/AudioSettingsModal.vue -->
<template>
  <BaseModal v-model="isOpen" title="⚙️ Audio Settings">
    <div class="audio-settings">
      <!-- Master Volume -->
      <div class="setting-group">
        <label>Volume Master</label>
        <input
          type="range"
          min="0"
          max="100"
          v-model="masterVolume"
          @input="updateMasterVolume"
          class="range range-primary"
        />
        <span>{{ masterVolume }}%</span>
      </div>

      <!-- Music Volume -->
      <div class="setting-group">
        <label>🎵 Música</label>
        <input
          type="range"
          min="0"
          max="100"
          v-model="musicVolume"
          @input="updateMusicVolume"
          class="range range-secondary"
        />
        <span>{{ musicVolume }}%</span>
      </div>

      <!-- SFX Volume -->
      <div class="setting-group">
        <label>🔊 Efectos</label>
        <input
          type="range"
          min="0"
          max="100"
          v-model="sfxVolume"
          @input="updateSfxVolume"
          class="range range-accent"
        />
        <span>{{ sfxVolume }}%</span>
      </div>

      <!-- Voice Volume -->
      <div class="setting-group">
        <label>🗣️ Voces</label>
        <input
          type="range"
          min="0"
          max="100"
          v-model="voiceVolume"
          @input="updateVoiceVolume"
          class="range range-success"
        />
        <span>{{ voiceVolume }}%</span>
      </div>

      <!-- Mute Toggle -->
      <div class="setting-group">
        <label>Silenciar todo</label>
        <input type="checkbox" v-model="muted" @change="updateMuted" class="toggle toggle-error" />
      </div>

      <!-- Test Buttons -->
      <div class="test-buttons">
        <button @click="testMusic" class="btn btn-sm">Test Música</button>
        <button @click="testSfx" class="btn btn-sm">Test SFX</button>
        <button @click="testVoice" class="btn btn-sm">Test Voz</button>
      </div>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { audioService } from '@/modules/core/services/audio.service'
import BaseModal from './BaseModal.vue'

const isOpen = defineModel<boolean>()

const masterVolume = ref(100)
const musicVolume = ref(60)
const sfxVolume = ref(80)
const voiceVolume = ref(100)
const muted = ref(false)

onMounted(() => {
  const volumes = audioService.getVolumes()
  masterVolume.value = volumes.master * 100
  musicVolume.value = volumes.music * 100
  sfxVolume.value = volumes.sfx * 100
  voiceVolume.value = volumes.voice * 100
  muted.value = volumes.muted
})

function updateMasterVolume() {
  audioService.setMasterVolume(masterVolume.value / 100)
}

function updateMusicVolume() {
  audioService.setChannelVolume('music', musicVolume.value / 100)
}

function updateSfxVolume() {
  audioService.setChannelVolume('sfx', sfxVolume.value / 100)
}

function updateVoiceVolume() {
  audioService.setChannelVolume('voice', voiceVolume.value / 100)
}

function updateMuted() {
  audioService.setMuted(muted.value)
}

function testMusic() {
  audioService.playMusic('/assets/audio/music/lobby.mp3')
}

function testSfx() {
  audioService.playSfx('ui-click')
}

function testVoice() {
  audioService.playVoice('/api/audio/system/intro')
}
</script>
```

---

## Debugging & Monitoring

```typescript
// modules/core/services/audio.service.ts (additions)

public getDebugInfo() {
  return {
    preloadedAssets: Array.from(this.assets.keys()),
    currentlyPlaying: {
      music: this.playing.music?.src || null,
      sfx: this.playing.sfx?.src || null,
      voice: this.playing.voice?.src || null
    },
    voiceQueueLength: this.voiceQueue.length,
    volumes: this.getVolumes(),
    audioContextState: this.audioContext?.state || 'not created'
  }
}
```

Consola debug:

```javascript
// En browser console
window.audioDebug = () => console.table(audioService.getDebugInfo())
```

---

## Resumen

| Aspecto            | Implementación             |
| ------------------ | -------------------------- |
| **Generación**     | ElevenLabs (backend only)  |
| **Almacenamiento** | RustFS S3                  |
| **Caché**          | Database + S3              |
| **Reproducción**   | HTML5 Audio API            |
| **Canales**        | music / sfx / voice        |
| **Queue**          | Sequential voice playback  |
| **Preload**        | Critical SFX on init       |
| **Lazy Load**      | Music per scene            |
| **Sync**           | Three.js AudioAnalyser     |
| **Locale**         | es-CO (español colombiano) |
| **Costo**          | Mínimo (seeders una vez)   |
| **Mobile**         | Autoplay unlock required   |

---

**Última actualización**: Diciembre 20, 2025  
**Versión**: 2.0.0 - Production Architecture
