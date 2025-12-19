# Three.js Integration & Chat System

## Three.js Integration

### Uso Específico: La Cuerda

Three.js se usa **exclusivamente** para el juego de La Cuerda, proporcionando una visualización 3D impactante de la competencia entre grupos.

### Principio Fundamental

```
Laravel calcula → Reverb emite → Vue actualiza store → Three.js SOLO anima
```

**Three.js NO decide**:

- ❌ Quién gana
- ❌ Progreso real
- ❌ Eliminaciones
- ❌ Puntuación

**Three.js SOLO**:

- ✅ Renderiza estado visual
- ✅ Anima tensión de cuerda
- ✅ Efectos cosmréticos
- ✅ Sincronización con audio (opcional)

### Estructura del Visual

```typescript
// modules/games/rope/rope.visual.ts
import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'

export class RopeVisual {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: WebGPURenderer
  private rope: THREE.Mesh
  private groups: Map<number, THREE.Group>

  constructor() {
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 100)
    this.renderer = new WebGPURenderer({ antialias: true })
    this.groups = new Map()

    this.setupCamera()
    this.setupLights()
    this.createRope()
  }

  public mount(container: HTMLElement) {
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(this.renderer.domElement)
    this.animate()
  }

  private setupCamera() {
    this.camera.position.set(0, 2, 5)
    this.camera.lookAt(0, 0, 0)
  }

  private setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(5, 10, 5)

    this.scene.add(ambientLight)
    this.scene.add(directionalLight)
  }

  private createRope() {
    // Cuerda cilíndrica marrón
    const geometry = new THREE.CylinderGeometry(0.05, 0.05, 4, 32)
    const material = new THREE.MeshStandardMaterial({
      color: 0x8b5a2b,
      roughness: 0.8,
    })

    this.rope = new THREE.Mesh(geometry, material)
    this.rope.rotation.z = Math.PI / 2 // Horizontal
    this.scene.add(this.rope)
  }

  // 👈 Llamado desde Vue cuando llega evento de Reverb
  public updateTension(value: number) {
    // value: -1 (grupo 1 gana) a 1 (grupo 2 gana)
    this.rope.position.x = value * 2

    // Efecto visual de tensión
    const stretch = 1 + Math.abs(value) * 0.1
    this.rope.scale.x = stretch
  }

  public showWinner(groupId: number) {
    // Animación de victoria
    const winnerGroup = this.groups.get(groupId)
    if (winnerGroup) {
      // Partículas, confeti, etc.
    }
  }

  private animate = () => {
    requestAnimationFrame(this.animate)
    this.renderer.render(this.scene, this.camera)
  }

  public dispose() {
    this.renderer.dispose()
    // Limpiar recursos
  }
}
```

### Integración con Vue

```vue
<!-- modules/games/rope/RopeScene.vue -->
<template>
  <div class="rope-game">
    <div ref="canvasContainer" class="canvas-container"></div>

    <div class="game-info">
      <h2>Grupo {{ currentGroup }}</h2>
      <p>¡Haz clic rápidamente!</p>
      <button @click="click" :disabled="!isActive">Click ({{ clickCount }})</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { RopeVisual } from './rope.visual'
import { useRopeStore } from './rope.store'
import { useRopeSocket } from './rope.socket'

const canvasContainer = ref<HTMLElement>()
const store = useRopeStore()
const { channel } = useRopeSocket()

let visual: RopeVisual | null = null

const clickCount = ref(0)
const isActive = ref(true)

const click = () => {
  if (!isActive.value) return

  clickCount.value++
  // Enviar a Laravel (throttled)
  store.sendClick()
}

// 👈 Sincronizar estado de Reverb con Three.js
watch(
  () => store.tension,
  (newTension) => {
    visual?.updateTension(newTension)
  },
)

watch(
  () => store.winnerGroup,
  (groupId) => {
    if (groupId) {
      visual?.showWinner(groupId)
    }
  },
)

onMounted(() => {
  if (canvasContainer.value) {
    visual = new RopeVisual()
    visual.mount(canvasContainer.value)
  }
})

onUnmounted(() => {
  visual?.dispose()
})
</script>
```

### Sincronización con Audio

```typescript
public bindAudio(audio: HTMLAudioElement) {
  const listener = new THREE.AudioListener()
  const sound = new THREE.Audio(listener)
  sound.setMediaElementSource(audio)

  const analyser = new THREE.AudioAnalyser(sound, 32)

  // En el loop de animación
  this.animate = () => {
    const frequency = analyser.getAverageFrequency()
    const intensity = frequency / 256

    // Vibración de la cuerda según audio
    this.rope.rotation.z = Math.PI / 2 + (Math.sin(Date.now() * 0.01) * intensity * 0.1)

    requestAnimationFrame(this.animate)
    this.renderer.render(this.scene, this.camera)
  }
}
```

### Fallback WebGL

```typescript
private createRenderer(): THREE.WebGLRenderer | WebGPURenderer {
  if ('gpu' in navigator) {
    try {
      return new WebGPURenderer({ antialias: true })
    } catch (e) {
      console.warn('WebGPU no disponible, usando WebGL')
    }
  }

  return new THREE.WebGLRenderer({ antialias: true })
}
```

---

## Chat en Tiempo Real

### Características

- **Texto + Emojis**: Solo texto y emojis unicode
- **Sin imágenes/audio**: Prevención de abuse
- **Rate limiting**: Prevenir spam
- **Moderación supervisor**: Silenciar jugadores
- **Persistencia**: Historial guardado (opcional)

### Backend: Modelo y Migración

```php
// database/migrations/create_chat_messages_table.php
Schema::create('chat_messages', function (Blueprint $table) {
    $table->id();
    $table->foreignId('player_id')->constrained();
    $table->text('message');
    $table->boolean('is_system')->default(false);
    $table->timestamp('sent_at');
    $table->timestamps();
});
```

### Backend: Evento Broadcast

```php
// app/Events/ChatMessageSent.php
class ChatMessageSent implements ShouldBroadcast
{
    public function __construct(
        public int $playerId,
        public string $nickname,
        public string $message,
        public string $color,
        public string $timestamp
    ) {}

    public function broadcastOn(): array
    {
        return [new Channel('chat.show')];
    }

    public function broadcastAs(): string
    {
        return 'ChatMessageSent';
    }
}
```

### Backend: Controller

```php
// app/Http/Controllers/ChatController.php
public function send(Request $request)
{
    $request->validate([
        'message' => 'required|string|max:200',
    ]);

    // Rate limiting
    RateLimiter::attempt(
        'chat:' . $request->user()->id,
        $perMinute = 10,
        function() {}
    );

    // Verificar si está silenciado
    if ($request->user()->is_muted) {
        return response()->json(['error' => 'Estás silenciado'], 403);
    }

    // Guardar mensaje (opcional)
    $message = ChatMessage::create([
        'player_id' => $request->user()->id,
        'message' => $request->message,
        'sent_at' => now(),
    ]);

    // Broadcast
    broadcast(new ChatMessageSent(
        $request->user()->id,
        $request->user()->nickname,
        $request->message,
        $request->user()->color,
        now()->toISOString()
    ));

    return response()->json(['success' => true]);
}

public function mute(Request $request)
{
    // Solo supervisores
    $this->authorize('mute', Player::class);

    $player = Player::findOrFail($request->player_id);
    $player->update(['is_muted' => true]);

    broadcast(new PlayerMuted($player->id));

    return response()->json(['success' => true]);
}
```

### Frontend: Store

```typescript
// modules/chat/chat.store.ts
import { defineStore } from 'pinia'

interface ChatMessage {
  id?: number
  playerId: number
  nickname: string
  message: string
  color: string
  timestamp: string
  isSystem?: boolean
}

export const useChatStore = defineStore('chat', {
  state: () => ({
    messages: [] as ChatMessage[],
    isMuted: false,
  }),

  actions: {
    addMessage(message: ChatMessage) {
      this.messages.push(message)

      // Limitar historial (últimos 100)
      if (this.messages.length > 100) {
        this.messages.shift()
      }
    },

    setMuted(value: boolean) {
      this.isMuted = value
    },

    clear() {
      this.messages = []
    },
  },
})
```

### Frontend: Socket

```typescript
// modules/chat/chat.socket.ts
import { echoService } from '@/modules/core/services/echo.service'
import { useChatStore } from './chat.store'

export function useChatSocket() {
  const store = useChatStore()

  const channel = echoService.channel('chat.show')

  channel.listen('ChatMessageSent', (event) => {
    store.addMessage({
      playerId: event.playerId,
      nickname: event.nickname,
      message: event.message,
      color: event.color,
      timestamp: event.timestamp,
    })
  })

  channel.listen('PlayerMuted', (event) => {
    const playerStore = usePlayerStore()
    if (event.player_id === playerStore.currentPlayer?.id) {
      store.setMuted(true)
    }
  })

  return { channel }
}
```

### Frontend: Componente

```vue
<!-- modules/chat/ChatBox.vue -->
<template>
  <div class="chat-box">
    <div class="chat-messages" ref="messagesContainer">
      <div
        v-for="msg in store.messages"
        :key="msg.timestamp"
        class="chat-message"
        :class="{ 'system-message': msg.isSystem }"
      >
        <span class="nickname" :style="{ color: msg.color }"> {{ msg.nickname }}: </span>
        <span class="message">{{ msg.message }}</span>
        <span class="timestamp">{{ formatTime(msg.timestamp) }}</span>
      </div>
    </div>

    <div class="chat-input">
      <input
        v-model="messageInput"
        @keyup.enter="sendMessage"
        :disabled="store.isMuted"
        :placeholder="store.isMuted ? 'Estás silenciado' : 'Escribe un mensaje...'"
        maxlength="200"
      />
      <button @click="showEmojiPicker" class="emoji-btn">😊</button>
      <button @click="sendMessage" :disabled="!canSend">Enviar</button>
    </div>

    <EmojiPicker v-if="emojiPickerOpen" @select="addEmoji" @close="emojiPickerOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { useChatStore } from './chat.store'
import { useChatSocket } from './chat.socket'
import { apiService } from '@/modules/core/services/api.service'
import EmojiPicker from './EmojiPicker.vue'

const store = useChatStore()
const { channel } = useChatSocket()

const messageInput = ref('')
const messagesContainer = ref<HTMLElement>()
const emojiPickerOpen = ref(false)

const canSend = computed(() => messageInput.value.trim().length > 0 && !store.isMuted)

const sendMessage = async () => {
  if (!canSend.value) return

  try {
    await apiService.post('/chat/send', {
      message: messageInput.value.trim(),
    })

    messageInput.value = ''
  } catch (error: any) {
    if (error.response?.status === 429) {
      alert('Estás enviando mensajes muy rápido. Espera un momento.')
    }
  }
}

const showEmojiPicker = () => {
  emojiPickerOpen.value = !emojiPickerOpen.value
}

const addEmoji = (emoji: string) => {
  messageInput.value += emoji
  emojiPickerOpen.value = false
}

const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Auto-scroll al último mensaje
watch(
  () => store.messages.length,
  async () => {
    await nextTick()
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  },
)
</script>

<style scoped>
.chat-box {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.chat-message {
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  border-radius: 0.25rem;
  background: rgba(255, 255, 255, 0.05);
}

.system-message {
  background: rgba(255, 215, 0, 0.1);
  font-style: italic;
}

.nickname {
  font-weight: bold;
  margin-right: 0.5rem;
}

.timestamp {
  font-size: 0.75rem;
  opacity: 0.6;
  margin-left: 0.5rem;
}

.chat-input {
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.chat-input input {
  flex: 1;
}
</style>
```

### Selector de Emojis (Simple)

```vue
<!-- modules/chat/EmojiPicker.vue -->
<template>
  <div class="emoji-picker">
    <button
      v-for="emoji in emojis"
      :key="emoji"
      @click="$emit('select', emoji)"
      class="emoji-option"
    >
      {{ emoji }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  select: [emoji: string]
  close: []
}>()

const emojis = [
  '😀',
  '😂',
  '🤣',
  '😊',
  '😍',
  '🥰',
  '😎',
  '🤔',
  '😮',
  '😢',
  '😭',
  '😡',
  '🤯',
  '🔥',
  '💯',
  '👍',
  '👎',
  '👏',
  '🙌',
  '🤝',
  '💪',
  '🎉',
  '🎊',
  '❤️',
]
</script>
```

### Moderación Supervisor

```vue
<!-- modules/supervisor/SupervisorDashboard.vue -->
<template>
  <div class="supervisor-dashboard">
    <!-- ... otras secciones ... -->

    <div class="chat-moderation">
      <h3>Moderación de Chat</h3>
      <div class="player-list">
        <div v-for="player in alivePlayers" :key="player.id" class="player-item">
          <span>{{ player.nickname }}</span>
          <button @click="mutePlayer(player.id)" :disabled="player.is_muted">
            {{ player.is_muted ? 'Silenciado' : 'Silenciar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePlayerStore } from '@/modules/player/player.store'
import { apiService } from '@/modules/core/services/api.service'

const playerStore = usePlayerStore()
const alivePlayers = computed(() => playerStore.alivePlayers)

const mutePlayer = async (playerId: number) => {
  try {
    await apiService.post('/chat/mute', { player_id: playerId })
    alert('Jugador silenciado')
  } catch (error) {
    alert('Error al silenciar jugador')
  }
}
</script>
```

## Resumen

### Three.js

- ✅ Solo visual (no lógica)
- ✅ Solo en La Cuerda
- ✅ Reacciona a estado de Laravel
- ✅ Fallback WebGL si no WebGPU
- ✅ Opcional: sincronización audio

### Chat

- ✅ Tiempo real con Reverb
- ✅ Solo texto + emojis
- ✅ Rate limiting
- ✅ Moderación supervisor
- ✅ Auto-scroll
- ✅ Historial limitado (100 mensajes)
