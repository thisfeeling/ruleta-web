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

## Frontend: AudioService

```typescript
// modules/core/services/audio.service.ts
class AudioService {
  private currentAudio: HTMLAudioElement | null = null
  private audioContext: AudioContext | null = null

  public async play(url: string, volume: number = 1.0): Promise<HTMLAudioElement> {
    // Detener audio anterior si existe
    this.stop()

    const audio = new Audio(url)
    audio.volume = volume

    this.currentAudio = audio

    await audio.play()

    return audio
  }

  public stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio.currentTime = 0
      this.currentAudio = null
    }
  }

  public fade(duration: number = 1000): void {
    if (!this.currentAudio) return

    const audio = this.currentAudio
    const startVolume = audio.volume
    const startTime = Date.now()

    const fadeInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      audio.volume = startVolume * (1 - progress)

      if (progress >= 1) {
        clearInterval(fadeInterval)
        this.stop()
      }
    }, 50)
  }

  public createAnalyzer(audio: HTMLAudioElement): AnalyserNode | null {
    if (!this.audioContext) {
      this.audioContext = new AudioContext()
    }

    const source = this.audioContext.createMediaElementSource(audio)
    const analyzer = this.audioContext.createAnalyser()

    analyzer.fftSize = 256

    source.connect(analyzer)
    analyzer.connect(this.audioContext.destination)

    return analyzer
  }
}

export const audioService = new AudioService()
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

## Composable para Audio

```typescript
// modules/core/composables/useAudio.ts
import { audioService } from '@/modules/core/services/audio.service'
import { ref } from 'vue'

export function useAudio() {
  const isPlaying = ref(false)
  const currentAudio = ref<HTMLAudioElement | null>(null)

  const play = async (url: string, volume = 1.0) => {
    try {
      isPlaying.value = true
      currentAudio.value = await audioService.play(url, volume)

      currentAudio.value.onended = () => {
        isPlaying.value = false
        currentAudio.value = null
      }
    } catch (error) {
      console.error('Error playing audio:', error)
      isPlaying.value = false
    }
  }

  const stop = () => {
    audioService.stop()
    isPlaying.value = false
    currentAudio.value = null
  }

  return {
    isPlaying,
    currentAudio,
    play,
    stop,
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

## Resumen

| Aspecto        | Implementación             |
| -------------- | -------------------------- |
| Generación     | ElevenLabs (backend only)  |
| Almacenamiento | RustFS S3                  |
| Caché          | Database + S3              |
| Reproducción   | HTML5 Audio API            |
| Sincronización | Three.js AudioAnalyser     |
| Locale         | es-CO (español colombiano) |
| Costo          | Mínimo (seeders una vez)   |
