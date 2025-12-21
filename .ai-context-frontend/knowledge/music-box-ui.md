# Music Box UI

## Descripción General

Componente visual que muestra información sobre la pista de audio actualmente reproducida. Ubicado en la esquina superior izquierda, el Music Box diferencia entre música de fondo (soundtracks) y efectos de sonido (SFX), mostrando metadata relevante como nombre de pista, imagen de portada, duración y progreso de reproducción.

**Características:**

- Posición fija esquina superior izquierda
- Diferenciación visual soundtrack vs effect
- Portada de álbum (o icono genérico)
- Nombre de pista + artista (opcional)
- Barra de progreso con duración
- Animaciones de entrada/salida (fade + slide)
- Auto-ocultamiento para efectos cortos (< 5s)
- Hover para mostrar detalles adicionales

---

## Arquitectura de Componentes

```
MusicBox
├── MusicBox.vue                  ← Contenedor principal
├── TrackInfo.vue                 ← Metadata de pista
├── ProgressBar.vue               ← Barra de progreso
└── music-box.store.ts            ← Estado Pinia (opcional)
```

**Flujo de visualización:**

1. `audio.service.ts` reproduce una pista (soundtrack o effect)
2. Emite evento `TrackStarted` con metadata
3. `MusicBox.vue` escucha y muestra información
4. Actualiza progreso en tiempo real
5. Al finalizar, emite `TrackEnded` y auto-oculta

---

## Componente Principal: MusicBox.vue

**Ubicación:** `src/ui/components/hud/MusicBox.vue`

### Características

- Posición: `fixed top-4 left-4`
- Z-index alto para estar sobre contenido de juego
- Animaciones: fade-in (300ms), slide-in desde izquierda
- Auto-hide para efectos cortos (< 5s)
- Hover expand para mostrar más detalles
- Translucent background con blur

### Template

```vue
<template>
  <Transition name="music-box">
    <div
      v-if="isVisible && currentTrack"
      class="fixed top-4 left-4 z-40"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
    >
      <!-- Music Box Container -->
      <div
        class="flex items-center gap-3 bg-base-100/80 backdrop-blur-md rounded-2xl shadow-2xl border border-base-300/50 transition-all duration-300"
        :class="[
          isHovered ? 'px-5 py-4' : 'px-4 py-3',
          currentTrack.type === 'soundtrack' ? 'min-w-[280px]' : 'min-w-[220px]',
        ]"
      >
        <!-- Album Art / Icon -->
        <div
          class="relative shrink-0 rounded-lg overflow-hidden shadow-md transition-all"
          :class="isHovered ? 'w-16 h-16' : 'w-12 h-12'"
        >
          <img
            v-if="currentTrack.artwork"
            :src="currentTrack.artwork"
            :alt="currentTrack.name"
            class="w-full h-full object-cover"
          />
          <div
            v-else
            class="w-full h-full flex items-center justify-center"
            :class="currentTrack.type === 'soundtrack' ? 'bg-primary/20' : 'bg-accent/20'"
          >
            <Icon
              :name="currentTrack.type === 'soundtrack' ? 'mdi:music-note' : 'mdi:volume-high'"
              class="w-6 h-6"
              :class="currentTrack.type === 'soundtrack' ? 'text-primary' : 'text-accent'"
            />
          </div>

          <!-- Playing Animation -->
          <div
            v-if="isPlaying"
            class="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent flex items-end justify-center pb-1"
          >
            <div class="flex gap-0.5">
              <div
                v-for="i in 4"
                :key="i"
                class="w-0.5 bg-primary rounded-full animate-pulse"
                :class="`h-${i + 1}`"
                :style="{ animationDelay: `${i * 0.1}s` }"
              />
            </div>
          </div>
        </div>

        <!-- Track Info -->
        <div class="flex-1 min-w-0">
          <!-- Track Type Label -->
          <div class="flex items-center gap-1.5 mb-1">
            <span
              class="text-xs font-medium uppercase tracking-wide"
              :class="currentTrack.type === 'soundtrack' ? 'text-primary' : 'text-accent'"
            >
              {{ currentTrack.type === 'soundtrack' ? $t('audio.soundtrack') : $t('audio.effect') }}
            </span>
          </div>

          <!-- Track Name -->
          <h4
            class="font-semibold text-sm leading-tight truncate"
            :class="isHovered ? 'text-base' : 'text-sm'"
          >
            {{ currentTrack.name }}
          </h4>

          <!-- Artist (if available, only for soundtracks) -->
          <p
            v-if="currentTrack.artist && currentTrack.type === 'soundtrack'"
            class="text-xs text-base-content/60 truncate"
          >
            {{ currentTrack.artist }}
          </p>

          <!-- Progress Bar (only for soundtracks or long effects) -->
          <div
            v-if="shouldShowProgress"
            class="mt-2 transition-opacity"
            :class="isHovered ? 'opacity-100' : 'opacity-70'"
          >
            <div class="flex items-center justify-between text-xs text-base-content/50 mb-1">
              <span>{{ formatTime(currentTime) }}</span>
              <span>{{ formatTime(currentTrack.duration) }}</span>
            </div>

            <div class="w-full h-1.5 bg-base-300 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-300"
                :class="currentTrack.type === 'soundtrack' ? 'bg-primary' : 'bg-accent'"
                :style="{ width: `${progress}%` }"
              />
            </div>
          </div>
        </div>

        <!-- Volume Indicator (hover only) -->
        <Transition name="fade">
          <div
            v-if="isHovered && currentTrack.volume !== undefined"
            class="flex items-center gap-1 text-base-content/50"
          >
            <Icon
              :name="currentTrack.volume > 0.5 ? 'mdi:volume-high' : 'mdi:volume-medium'"
              class="w-4 h-4"
            />
            <span class="text-xs">{{ Math.round(currentTrack.volume * 100) }}%</span>
          </div>
        </Transition>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useAudioStore } from '@/modules/core/stores/audio.store'
import type { AudioTrack } from '@/types/audio.types'

const audioStore = useAudioStore()

// State
const isVisible = ref(false)
const isHovered = ref(false)
const isPlaying = ref(false)
const currentTime = ref(0)
const currentTrack = ref<AudioTrack | null>(null)

// Computed
const progress = computed(() => {
  if (!currentTrack.value || currentTrack.value.duration === 0) return 0
  return (currentTime.value / currentTrack.value.duration) * 100
})

const shouldShowProgress = computed(() => {
  if (!currentTrack.value) return false
  // Show progress for soundtracks or effects longer than 5 seconds
  return currentTrack.value.type === 'soundtrack' || currentTrack.value.duration > 5
})

// Progress update interval
let progressInterval: number | null = null

function startProgressTracking() {
  if (progressInterval) return

  progressInterval = setInterval(() => {
    if (isPlaying.value && currentTrack.value) {
      currentTime.value += 0.1

      // Auto-hide when track ends
      if (currentTime.value >= currentTrack.value.duration) {
        handleTrackEnd()
      }
    }
  }, 100) as unknown as number
}

function stopProgressTracking() {
  if (progressInterval) {
    clearInterval(progressInterval)
    progressInterval = null
  }
}

// Event handlers
function handleTrackStart(track: AudioTrack) {
  currentTrack.value = track
  currentTime.value = 0
  isPlaying.value = true
  isVisible.value = true

  // Auto-hide short effects (< 5s)
  if (track.type === 'effect' && track.duration < 5) {
    setTimeout(() => {
      if (currentTrack.value?.id === track.id) {
        isVisible.value = false
      }
    }, track.duration * 1000)
  }

  startProgressTracking()
}

function handleTrackEnd() {
  isPlaying.value = false
  stopProgressTracking()

  // Fade out after 1 second
  setTimeout(() => {
    isVisible.value = false
    currentTrack.value = null
    currentTime.value = 0
  }, 1000)
}

function handleTrackPause() {
  isPlaying.value = false
  stopProgressTracking()
}

function handleTrackResume() {
  isPlaying.value = true
  startProgressTracking()
}

// Listen to audio store events
watch(
  () => audioStore.currentTrack,
  (track) => {
    if (track) {
      handleTrackStart(track)
    } else {
      handleTrackEnd()
    }
  },
  { immediate: true },
)

watch(
  () => audioStore.isPlaying,
  (playing) => {
    if (playing) {
      handleTrackResume()
    } else {
      handleTrackPause()
    }
  },
)

// Utility
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Lifecycle
onMounted(() => {
  // Check if there's already a track playing
  if (audioStore.currentTrack) {
    handleTrackStart(audioStore.currentTrack)
  }
})

onBeforeUnmount(() => {
  stopProgressTracking()
})
</script>

<style scoped>
/* Music Box Transition */
.music-box-enter-active,
.music-box-leave-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.music-box-enter-from {
  opacity: 0;
  transform: translateX(-20px) scale(0.95);
}

.music-box-leave-to {
  opacity: 0;
  transform: translateX(-20px) scale(0.9);
}

/* Fade Transition for volume */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Pulse Animation for bars */
@keyframes pulse-bar {
  0%,
  100% {
    height: 0.25rem;
  }
  50% {
    height: 0.75rem;
  }
}

.animate-pulse {
  animation: pulse-bar 1s ease-in-out infinite;
}
</style>
```

---

## Tipos TypeScript

**Ubicación:** `src/types/audio.types.ts`

```typescript
export type AudioType = 'soundtrack' | 'effect' | 'voice' | 'ambience'

export interface AudioTrack {
  id: string
  name: string
  type: AudioType
  url: string
  duration: number // en segundos
  artist?: string // Solo para soundtracks
  artwork?: string // URL de portada (opcional)
  volume?: number // 0.0 - 1.0
  loop?: boolean
  metadata?: {
    genre?: string
    bpm?: number
    mood?: string
  }
}

export interface AudioChannel {
  name: string
  type: AudioType
  volume: number
  currentTrack: AudioTrack | null
  queue: AudioTrack[]
}
```

---

## Integración con audio.service.ts

**Ubicación:** `src/modules/core/services/audio.service.ts` (actualizar)

### Agregar emitters para eventos de track

```typescript
import { EventEmitter } from 'events'

class AudioService extends EventEmitter {
  private channels: Map<AudioType, AudioChannel> = new Map()
  private audioContext: AudioContext

  constructor() {
    super()
    this.initializeChannels()
  }

  private initializeChannels() {
    const types: AudioType[] = ['soundtrack', 'effect', 'voice', 'ambience']

    types.forEach((type) => {
      this.channels.set(type, {
        name: type,
        type,
        volume: 1.0,
        currentTrack: null,
        queue: [],
      })
    })
  }

  async play(track: AudioTrack): Promise<void> {
    const channel = this.channels.get(track.type)
    if (!channel) throw new Error(`Channel ${track.type} not found`)

    // Stop current track in channel
    if (channel.currentTrack) {
      await this.stop(track.type)
    }

    // Create audio element
    const audio = new Audio(track.url)
    audio.volume = (track.volume ?? 1.0) * channel.volume
    audio.loop = track.loop ?? false

    // Set as current track
    channel.currentTrack = track

    // Emit TrackStarted event
    this.emit('track:started', track)

    // Play
    await audio.play()

    // Handle track end
    audio.addEventListener('ended', () => {
      this.emit('track:ended', track)
      channel.currentTrack = null

      // Play next in queue
      if (channel.queue.length > 0) {
        const next = channel.queue.shift()!
        this.play(next)
      }
    })

    // Store audio element reference
    ;(channel as any).audioElement = audio
  }

  pause(type: AudioType): void {
    const channel = this.channels.get(type)
    if (!channel) return

    const audio = (channel as any).audioElement as HTMLAudioElement
    if (audio) {
      audio.pause()
      this.emit('track:paused', channel.currentTrack)
    }
  }

  resume(type: AudioType): void {
    const channel = this.channels.get(type)
    if (!channel) return

    const audio = (channel as any).audioElement as HTMLAudioElement
    if (audio) {
      audio.play()
      this.emit('track:resumed', channel.currentTrack)
    }
  }

  stop(type: AudioType): void {
    const channel = this.channels.get(type)
    if (!channel) return

    const audio = (channel as any).audioElement as HTMLAudioElement
    if (audio) {
      audio.pause()
      audio.currentTime = 0
      this.emit('track:stopped', channel.currentTrack)
      channel.currentTrack = null
    }
  }

  setVolume(type: AudioType, volume: number): void {
    const channel = this.channels.get(type)
    if (!channel) return

    channel.volume = Math.max(0, Math.min(1, volume))

    const audio = (channel as any).audioElement as HTMLAudioElement
    if (audio && channel.currentTrack) {
      audio.volume = (channel.currentTrack.volume ?? 1.0) * channel.volume
    }

    this.emit('volume:changed', { type, volume: channel.volume })
  }

  getCurrentTrack(type: AudioType): AudioTrack | null {
    return this.channels.get(type)?.currentTrack ?? null
  }

  getCurrentTime(type: AudioType): number {
    const channel = this.channels.get(type)
    if (!channel) return 0

    const audio = (channel as any).audioElement as HTMLAudioElement
    return audio?.currentTime ?? 0
  }

  queueTrack(track: AudioTrack): void {
    const channel = this.channels.get(track.type)
    if (!channel) return

    channel.queue.push(track)
    this.emit('track:queued', track)
  }
}

export const audioService = new AudioService()
```

---

## Store Pinia: audio.store.ts

**Ubicación:** `src/modules/core/stores/audio.store.ts`

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { audioService } from '@/modules/core/services/audio.service'
import type { AudioTrack, AudioType } from '@/types/audio.types'

export const useAudioStore = defineStore('audio', () => {
  // State
  const currentTrack = ref<AudioTrack | null>(null)
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const volume = ref<Record<AudioType, number>>({
    soundtrack: 1.0,
    effect: 1.0,
    voice: 1.0,
    ambience: 1.0,
  })

  // Getters
  const isSoundtrackPlaying = computed(() => {
    return currentTrack.value?.type === 'soundtrack' && isPlaying.value
  })

  const currentSoundtrack = computed(() => {
    return currentTrack.value?.type === 'soundtrack' ? currentTrack.value : null
  })

  // Actions
  async function play(track: AudioTrack) {
    try {
      await audioService.play(track)
      currentTrack.value = track
      isPlaying.value = true
    } catch (error) {
      console.error('Error playing track:', error)
    }
  }

  function pause(type: AudioType) {
    audioService.pause(type)
    isPlaying.value = false
  }

  function resume(type: AudioType) {
    audioService.resume(type)
    isPlaying.value = true
  }

  function stop(type: AudioType) {
    audioService.stop(type)
    currentTrack.value = null
    isPlaying.value = false
    currentTime.value = 0
  }

  function setVolume(type: AudioType, newVolume: number) {
    volume.value[type] = newVolume
    audioService.setVolume(type, newVolume)
  }

  function updateCurrentTime(type: AudioType) {
    currentTime.value = audioService.getCurrentTime(type)
  }

  // Event listeners
  audioService.on('track:started', (track: AudioTrack) => {
    currentTrack.value = track
    isPlaying.value = true
    currentTime.value = 0
  })

  audioService.on('track:ended', (track: AudioTrack) => {
    if (currentTrack.value?.id === track.id) {
      currentTrack.value = null
      isPlaying.value = false
      currentTime.value = 0
    }
  })

  audioService.on('track:paused', () => {
    isPlaying.value = false
  })

  audioService.on('track:resumed', () => {
    isPlaying.value = true
  })

  return {
    // State
    currentTrack,
    isPlaying,
    currentTime,
    volume,

    // Getters
    isSoundtrackPlaying,
    currentSoundtrack,

    // Actions
    play,
    pause,
    resume,
    stop,
    setVolume,
    updateCurrentTime,
  }
})
```

---

## Backend: Supervisor Upload de Soundtracks

### Action: UploadSoundtrack.php

**Ubicación:** `app/Actions/Audio/UploadSoundtrack.php`

```php
<?php

namespace App\Actions\Audio;

use App\Models\Soundtrack;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use getID3;

class UploadSoundtrack
{
    public function execute(
        UploadedFile $file,
        string $name,
        ?string $artist = null,
        ?UploadedFile $artwork = null
    ): Soundtrack {
        // Validate file type
        $allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'];
        if (!in_array($file->getMimeType(), $allowedTypes)) {
            throw new \InvalidArgumentException('Invalid audio file type');
        }

        // Extract metadata with getID3
        $getID3 = new getID3();
        $fileInfo = $getID3->analyze($file->getRealPath());
        $duration = $fileInfo['playtime_seconds'] ?? 0;

        // Upload to RustFS (S3)
        $audioPath = Storage::disk('s3')->putFile('soundtracks', $file);

        // Upload artwork if provided
        $artworkPath = null;
        if ($artwork) {
            $artworkPath = Storage::disk('s3')->putFile('soundtracks/artwork', $artwork);
        }

        // Create database record
        $soundtrack = Soundtrack::create([
            'name' => $name,
            'artist' => $artist,
            'file_path' => $audioPath,
            'artwork_path' => $artworkPath,
            'duration' => $duration,
            'file_size' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
            'metadata' => [
                'bitrate' => $fileInfo['audio']['bitrate'] ?? null,
                'sample_rate' => $fileInfo['audio']['sample_rate'] ?? null,
                'channels' => $fileInfo['audio']['channels'] ?? null,
            ],
            'uploaded_by' => auth()->id(),
        ]);

        // Audit event
        app(AuditService::class)->log(
            type: 'system',
            action: 'soundtrack_uploaded',
            userId: auth()->id(),
            metadata: [
                'soundtrack_id' => $soundtrack->id,
                'name' => $name,
                'duration' => $duration,
                'file_size' => $file->getSize(),
            ]
        );

        return $soundtrack;
    }
}
```

### Migration: soundtracks table

```php
Schema::create('soundtracks', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('artist')->nullable();
    $table->string('file_path'); // S3 path
    $table->string('artwork_path')->nullable(); // S3 path
    $table->float('duration'); // seconds
    $table->integer('file_size'); // bytes
    $table->string('mime_type');
    $table->json('metadata')->nullable();
    $table->foreignId('uploaded_by')->constrained('users');
    $table->timestamps();
});
```

---

## WebSocket Events

### Event: TrackStarted

**Channel:** `session.{sessionId}`

**Payload:**

```typescript
interface TrackStartedPayload {
  track: AudioTrack
  sessionId: string
  timestamp: number
}
```

**Backend (Laravel):**

```php
<?php

namespace App\Events;

use App\Models\Soundtrack;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TrackStarted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $sessionId,
        public Soundtrack $soundtrack,
    ) {}

    public function broadcastOn(): Channel
    {
        return new Channel("session.{$this->sessionId}");
    }

    public function broadcastWith(): array
    {
        return [
            'track' => [
                'id' => $this->soundtrack->id,
                'name' => $this->soundtrack->name,
                'artist' => $this->soundtrack->artist,
                'type' => 'soundtrack',
                'url' => Storage::disk('s3')->url($this->soundtrack->file_path),
                'artwork' => $this->soundtrack->artwork_path
                    ? Storage::disk('s3')->url($this->soundtrack->artwork_path)
                    : null,
                'duration' => $this->soundtrack->duration,
                'volume' => 0.7, // Default volume
            ],
            'sessionId' => $this->sessionId,
            'timestamp' => now()->timestamp,
        ];
    }
}
```

### Event: TrackEnded

**Payload:**

```typescript
interface TrackEndedPayload {
  trackId: string
  sessionId: string
  playedDuration: number
  timestamp: number
}
```

---

## Casos de Uso

### 1. Reproducir soundtrack de fondo en lobby

1. Supervisor selecciona soundtrack desde dashboard
2. Backend emite `TrackStarted` con metadata completa
3. `audio.service.ts` reproduce en canal `soundtrack`
4. `MusicBox.vue` muestra portada + nombre + artista + barra de progreso
5. Componente actualiza progreso cada 100ms
6. Al finalizar, emite `TrackEnded` y oculta MusicBox

### 2. Efecto de sonido corto (< 5s)

1. Jugador responde correctamente → Backend envía efecto "correct.mp3"
2. `audio.service.ts` reproduce en canal `effect`
3. `MusicBox.vue` muestra icono de volumen + nombre del efecto
4. NO muestra barra de progreso (duración < 5s)
5. Auto-oculta después de 3 segundos

### 3. Hover para ver detalles

1. Usuario pasa mouse sobre MusicBox
2. Componente expande (scale 1.05)
3. Muestra volumen actual + artista completo
4. Barra de progreso más visible (opacity 100%)
5. Al quitar hover, vuelve a estado compacto

---

## Posicionamiento y Responsive

### Desktop (> 1024px)

```css
.music-box {
  position: fixed;
  top: 1rem; /* 16px */
  left: 1rem;
  z-index: 40;
}
```

### Tablet (768px - 1024px)

```css
@media (max-width: 1024px) {
  .music-box {
    top: 0.75rem; /* 12px */
    left: 0.75rem;
    /* Reduce tamaño de portada */
  }
}
```

### Mobile (< 768px)

```css
@media (max-width: 768px) {
  .music-box {
    top: 0.5rem; /* 8px */
    left: 0.5rem;
    /* Solo icono + nombre (sin artista ni progreso) */
  }
}
```

**Nota:** En móvil, considerar posición top-center para no obstruir chat lateral.

---

## Animaciones CSS

### Entrada (fade + slide)

```css
.music-box-enter-active {
  animation: slideInLeft 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}
```

### Salida (fade + slide)

```css
.music-box-leave-active {
  animation: slideOutLeft 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes slideOutLeft {
  from {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateX(-20px) scale(0.9);
  }
}
```

### Pulsación de barras (playing animation)

```css
@keyframes pulseBars {
  0%,
  100% {
    height: 0.25rem;
  }
  50% {
    height: 0.75rem;
  }
}

.bar {
  animation: pulseBars 1s ease-in-out infinite;
}

.bar:nth-child(1) {
  animation-delay: 0s;
}
.bar:nth-child(2) {
  animation-delay: 0.1s;
}
.bar:nth-child(3) {
  animation-delay: 0.2s;
}
.bar:nth-child(4) {
  animation-delay: 0.3s;
}
```

---

## i18n Keys

```json
{
  "audio": {
    "soundtrack": "Música",
    "effect": "Efecto",
    "voice": "Voz",
    "ambience": "Ambiente",
    "nowPlaying": "Reproduciendo ahora",
    "volume": "Volumen",
    "duration": "Duración",
    "artist": "Artista"
  }
}
```

---

## Consideraciones de UX

1. **No obstruir juego:** Posición fija pero con z-index que permita interacción con elementos críticos
2. **Auto-hide inteligente:** Efectos cortos (< 5s) no necesitan mostrar progreso
3. **Hover sutil:** Expansión leve (no invasiva) al pasar mouse
4. **Diferenciación visual:** Colores distintos para soundtrack (primary) vs effect (accent)
5. **Performance:** Throttle de updates de progreso (cada 100ms, no en cada frame)
6. **Accesibilidad:** ARIA labels, contraste suficiente en texto

---

## Mejoras Futuras

- **Click para expandir:** Panel lateral con historial de tracks reproducidos
- **Scrubbing:** Permitir saltar a posición específica de la pista (solo supervisores)
- **Visualizador de audio:** Waveform o spectrum analyzer (canvas/WebGL)
- **Queue visible:** Mostrar próximas 3 pistas en cola
- **Favoritos:** Marcar soundtracks favoritos para reutilizar
- **Lyrics:** Sincronización de letras (formato LRC)
- **Equalizer:** Controles de graves/agudos (solo supervisores)

---

## Dependencias

- **Pinia:** Estado global de audio (`audio.store.ts`)
- **audio.service.ts:** Servicio de reproducción con canales separados
- **RustFS (S3):** Storage de archivos de audio
- **getID3 (PHP):** Extracción de metadata de archivos de audio
- **Reverb WebSockets:** Sincronización de reproducción entre clientes
- **Audit System:** Logging de reproducciones de soundtracks

---

## Estructura de Archivos

```
src/ui/components/hud/
├── MusicBox.vue                  ← Componente principal
├── TrackInfo.vue                 ← (opcional) Metadata separada
└── ProgressBar.vue               ← (opcional) Barra de progreso

src/modules/core/services/
└── audio.service.ts              ← Servicio de audio (actualizar)

src/modules/core/stores/
└── audio.store.ts                ← Estado Pinia

src/types/
└── audio.types.ts                ← Tipos TypeScript

app/Actions/Audio/
└── UploadSoundtrack.php          ← Backend upload

app/Events/
├── TrackStarted.php              ← WebSocket event
└── TrackEnded.php                ← WebSocket event

app/Models/
└── Soundtrack.php                ← Modelo Laravel
```
