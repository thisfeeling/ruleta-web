# 16 - Chat, Supervisor & Auxiliary Systems

**Status**: [ ] Not Started | [ ] In Progress | [ ] Completed | [ ] Tested

---

## 📋 Overview

Sistemas auxiliares: Chat en tiempo real, panel de supervisor, achievements, y auditoría.

---

## 🎯 Objectives

- [ ] Implementar sistema de chat
- [ ] Implementar panel de supervisor
- [ ] Implementar sistema de achievements
- [ ] Implementar sistema de auditoría (client-side) (saved-backend BD)

---

## 📁 Files to Create

```
src/modules/
├── chat/
│   ├── chat.store.ts
│   ├── chat.socket.ts
│   ├── ChatBox.vue
│   └── ChatMessage.vue
│
├── supervisor/
│   ├── supervisor.store.ts
│   ├── SupervisorDashboard.vue
│   ├── AudioReview.vue
│   └── PlayerTimeline.vue
│
├── achievements/ 
│   ├── achievements.store.ts
│   ├── achievements.socket.ts
│   └── AchievementToast.vue
│
└── audit/ 
    ├── audit.store.ts
    └── AuditViewer.vue
```

---

## 🎮 CHAT SYSTEM

### 1. Chat Store (`chat/chat.store.ts`)

```typescript
export interface ChatMessage {
  id: string
  player_id: number
  player_number: number
  nickname: string
  color: string
  message: string
  timestamp: string
  type: 'player' | 'system'
}

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>([])
  const maxMessages = 100

  function addMessage(message: ChatMessage) {
    messages.value.push(message)

    // Keep only last maxMessages
    if (messages.value.length > maxMessages) {
      messages.value = messages.value.slice(-maxMessages)
    }
  }

  function clear() {
    messages.value = []
  }

  return { messages, addMessage, clear }
})
```

### 2. Chat Socket (`chat/chat.socket.ts`)

```typescript
export function useChatWebSocket() {
  const store = useChatStore()
  const { channel } = useEcho()

  const chatChannel = channel('game.chat')

  chatChannel.listen('MessageSent', (event: any) => {
    store.addMessage({
      id: event.id,
      player_id: event.player_id,
      player_number: event.player_number,
      nickname: event.nickname,
      color: event.color,
      message: event.message,
      timestamp: event.timestamp,
      type: 'player',
    })
  })

  chatChannel.listen('SystemMessage', (event: any) => {
    store.addMessage({
      id: event.id,
      player_id: 0,
      player_number: 0,
      nickname: 'Sistema',
      color: '#888888',
      message: event.message,
      timestamp: event.timestamp,
      type: 'system',
    })
  })
}
```

### 3. ChatBox Component (`chat/ChatBox.vue`)

```vue
<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { useChatStore } from './chat.store'
import { useChatWebSocket } from './chat.socket'
import { useApi } from '@/modules/core/composables/useApi'
import ChatMessage from './ChatMessage.vue'

const store = useChatStore()
const api = useApi()
const messageInput = ref('')
const messagesContainer = ref<HTMLElement>()

useChatWebSocket()

// Auto-scroll to bottom on new messages
watch(
  () => store.messages.length,
  () => {
    nextTick(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
    })
  },
)

async function sendMessage() {
  if (!messageInput.value.trim()) return

  try {
    await api.post('/api/chat/send', {
      message: messageInput.value,
    })
    messageInput.value = ''
  } catch (error) {
    console.error('[Chat] Failed to send message:', error)
  }
}
</script>

<template>
  <div class="chat-box">
    <div class="chat-box__header">
      {{ $t('chat.title') }}
    </div>

    <div ref="messagesContainer" class="chat-box__messages">
      <ChatMessage v-for="message in store.messages" :key="message.id" :message="message" />
    </div>

    <div class="chat-box__input">
      <input
        v-model="messageInput"
        type="text"
        :placeholder="$t('chat.placeholder')"
        class="input input-bordered input-sm w-full"
        @keyup.enter="sendMessage"
      />
      <button class="btn btn-primary btn-sm" @click="sendMessage">
        {{ $t('chat.sendMessage') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.chat-box {
  @apply fixed bottom-4 left-4 z-50;
  @apply w-80 h-96 flex flex-col;
  @apply bg-base-100 rounded-xl shadow-2xl overflow-hidden;
}

.chat-box__header {
  @apply px-4 py-2 bg-base-200 font-bold text-sm;
}

.chat-box__messages {
  @apply flex-1 overflow-y-auto p-3 space-y-2;
}

.chat-box__input {
  @apply flex gap-2 p-3 bg-base-200;
}
</style>
```

### 4. ChatMessage Component (`chat/ChatMessage.vue`)

```vue
<script setup lang="ts">
import type { ChatMessage } from './chat.store'

interface Props {
  message: ChatMessage
}

defineProps<Props>()
</script>

<template>
  <div class="chat-message" :class="{ 'chat-message--system': message.type === 'system' }">
    <div class="chat-message__header">
      <span
        v-if="message.type === 'player'"
        class="chat-message__number"
        :style="{ backgroundColor: message.color }"
      >
        {{ message.player_number }}
      </span>
      <span class="chat-message__nickname">{{ message.nickname }}</span>
      <span class="chat-message__time">
        {{ new Date(message.timestamp).toLocaleTimeString() }}
      </span>
    </div>
    <div class="chat-message__text">
      {{ message.message }}
    </div>
  </div>
</template>

<style scoped>
.chat-message {
  @apply bg-base-200 rounded-lg p-2;
}

.chat-message--system {
  @apply bg-info/20;
}

.chat-message__header {
  @apply flex items-center gap-2 mb-1;
}

.chat-message__number {
  @apply w-5 h-5 rounded flex items-center justify-center;
  @apply text-white text-xs font-bold;
}

.chat-message__nickname {
  @apply font-semibold text-sm;
}

.chat-message__time {
  @apply ml-auto text-xs text-base-content/60;
}

.chat-message__text {
  @apply text-sm;
}
</style>
```

**Checklist**:

- [ ] Create chat store
- [ ] Implement WebSocket listeners
- [ ] Create ChatBox component (bottom-left)
- [ ] Create ChatMessage component
- [ ] Auto-scroll to latest message
- [ ] Test sending/receiving messages

---

## 👨‍💼 SUPERVISOR PANEL

### 1. Supervisor Store (`supervisor/supervisor.store.ts`)

```typescript
export interface PendingValidation {
  id: string
  player_id: number
  player_number: number
  nickname: string
  word: string
  audio_url: string
  uploaded_at: string
}

export const useSupervisorStore = defineStore('supervisor', () => {
  const pendingValidations = ref<PendingValidation[]>([])
  const isActive = ref(false)

  function addValidation(validation: PendingValidation) {
    pendingValidations.value.push(validation)
  }

  function removeValidation(id: string) {
    const index = pendingValidations.value.findIndex((v) => v.id === id)
    if (index !== -1) {
      pendingValidations.value.splice(index, 1)
    }
  }

  function clearValidations() {
    pendingValidations.value = []
  }

  return {
    pendingValidations,
    isActive,
    addValidation,
    removeValidation,
    clearValidations,
  }
})
```

### 2. SupervisorDashboard (`supervisor/SupervisorDashboard.vue`)

```vue
<script setup lang="ts">
import { useAuthStore } from '@/modules/core/stores/auth.store'
import { useGameStore } from '@/modules/game/stores/game.store'
import { useApi } from '@/modules/core/composables/useApi'
import { useUIStore } from '@/modules/core/stores/ui.store'
import AudioReview from './AudioReview.vue'
import PlayerTimeline from './PlayerTimeline.vue'

const authStore = useAuthStore()
const gameStore = useGameStore()
const api = useApi()
const uiStore = useUIStore()

// Redirect if not supervisor
if (!authStore.isSupervisor) {
  window.location.href = '/'
}

async function startGame() {
  try {
    await api.post('/api/supervisor/start-game')
    uiStore.success('Juego iniciado')
  } catch (error) {
    uiStore.error('No se pudo iniciar el juego')
  }
}

async function nextRound() {
  try {
    await api.post('/api/supervisor/next-round')
    uiStore.success('Siguiente ronda')
  } catch (error) {
    uiStore.error('No se pudo avanzar')
  }
}

async function startBonusGame(game: string) {
  try {
    await api.post('/api/supervisor/start-bonus', { game })
    uiStore.success(`Juego bonus ${game} iniciado`)
  } catch (error) {
    uiStore.error('No se pudo iniciar el juego bonus')
  }
}

async function endGame() {
  try {
    await api.post('/api/supervisor/end-game')
    uiStore.success('Juego terminado')
  } catch (error) {
    uiStore.error('No se pudo terminar el juego')
  }
}
</script>

<template>
  <div class="supervisor-dashboard">
    <div class="supervisor-dashboard__header">
      <h1 class="text-3xl font-bold">{{ $t('supervisor.title') }}</h1>
    </div>

    <!-- Controls -->
    <div class="supervisor-dashboard__controls">
      <h2 class="text-xl font-bold">{{ $t('supervisor.controls') }}</h2>
      <div class="flex gap-4">
        <button class="btn btn-primary" @click="startGame">
          {{ $t('supervisor.startGame') }}
        </button>
        <button class="btn btn-secondary" @click="nextRound">
          {{ $t('supervisor.nextRound') }}
        </button>
        <button class="btn btn-accent" @click="startBonusGame('word-search')">¡A Buscar!</button>
        <button class="btn btn-accent" @click="startBonusGame('flappy')">No Lo Choques</button>
        <button class="btn btn-error" @click="endGame">
          {{ $t('supervisor.endGame') }}
        </button>
      </div>
    </div>

    <!-- Audio Validations -->
    <div class="supervisor-dashboard__validations">
      <AudioReview />
    </div>

    <!-- Player Timeline -->
    <div class="supervisor-dashboard__timeline">
      <PlayerTimeline />
    </div>
  </div>
</template>

<style scoped>
.supervisor-dashboard {
  @apply container mx-auto p-6 space-y-8;
}

.supervisor-dashboard__header {
  @apply pb-4 border-b border-base-300;
}

.supervisor-dashboard__controls {
  @apply card bg-base-200 p-6;
}

.supervisor-dashboard__validations {
  @apply card bg-base-200 p-6;
}

.supervisor-dashboard__timeline {
  @apply card bg-base-200 p-6;
}
</style>
```

### 3. AudioReview Component (`supervisor/AudioReview.vue`)

```vue
<script setup lang="ts">
import { useSupervisorStore } from './supervisor.store'
import { useApi } from '@/modules/core/composables/useApi'
import { useUIStore } from '@/modules/core/stores/ui.store'

const store = useSupervisorStore()
const api = useApi()
const uiStore = useUIStore()

async function approve(validationId: string) {
  try {
    await api.post(`/api/supervisor/validate-audio/${validationId}`, {
      approved: true,
    })
    store.removeValidation(validationId)
    uiStore.success('Audio aprobado')
  } catch (error) {
    uiStore.error('Error al aprobar')
  }
}

async function reject(validationId: string) {
  try {
    await api.post(`/api/supervisor/validate-audio/${validationId}`, {
      approved: false,
    })
    store.removeValidation(validationId)
    uiStore.warning('Audio rechazado')
  } catch (error) {
    uiStore.error('Error al rechazar')
  }
}
</script>

<template>
  <div class="audio-review">
    <h2 class="text-xl font-bold mb-4">
      {{ $t('supervisor.pendingValidations') }}
    </h2>

    <div v-if="store.pendingValidations.length === 0" class="text-center py-8">
      <p class="text-base-content/60">No hay validaciones pendientes</p>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="validation in store.pendingValidations"
        :key="validation.id"
        class="audio-review__item"
      >
        <div class="audio-review__player">
          <span class="font-bold">Jugador #{{ validation.player_number }}</span>
          <span>{{ validation.nickname }}</span>
        </div>

        <div class="audio-review__word">
          Palabra: <strong>{{ validation.word }}</strong>
        </div>

        <audio controls class="audio-review__player">
          <source :src="validation.audio_url" type="audio/mpeg" />
        </audio>

        <div class="audio-review__actions">
          <button class="btn btn-success btn-sm" @click="approve(validation.id)">
            {{ $t('supervisor.approve') }}
          </button>
          <button class="btn btn-error btn-sm" @click="reject(validation.id)">
            {{ $t('supervisor.reject') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.audio-review__item {
  @apply card bg-base-100 p-4 space-y-3;
}

.audio-review__player {
  @apply flex items-center gap-2;
}

.audio-review__word {
  @apply text-sm;
}

.audio-review__actions {
  @apply flex gap-2;
}
</style>
```

**Checklist**:

- [ ] Create supervisor store
- [ ] Create SupervisorDashboard with controls
- [ ] Implement start game/round/bonus/end actions
- [ ] Create AudioReview component
- [ ] Test approval/rejection of audio
- [ ] Restrict access to supervisor only

---

## 🏆 ACHIEVEMENTS SYSTEM 

### Achievement Store (`achievements/achievements.store.ts`)

```typescript
export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  unlocked_at: string
}

export const useAchievementsStore = defineStore('achievements', () => {
  const achievements = ref<Achievement[]>([])
  const unlockedIds = ref<Set<string>>(new Set())

  function unlock(achievement: Achievement) {
    if (!unlockedIds.value.has(achievement.id)) {
      achievements.value.push(achievement)
      unlockedIds.value.add(achievement.id)
    }
  }

  return { achievements, unlock }
})
```

**Checklist**:

- [ ] Create achievements store
- [ ] Listen to AchievementUnlocked event
- [ ] Display toast notification
- [ ] Store unlocked achievements

---

## ✅ Acceptance Criteria

### Chat

- [ ] Messages send and receive in real-time
- [ ] Auto-scrolls to latest message
- [ ] Shows player number, nickname, color
- [ ] System messages display correctly
- [ ] Positioned bottom-left, doesn't obstruct gameplay

### Supervisor

- [ ] Dashboard accessible only by supervisor
- [ ] Can start/stop game
- [ ] Can advance to next round
- [ ] Can start bonus games manually
- [ ] Audio review works (play, approve, reject)
- [ ] PlayerTimeline shows game flow
- [ ] All controls functional

### Achievements (if implemented)

- [ ] Achievements unlock on events
- [ ] Toast notification shows
- [ ] Stored in player profile
- [ ] Display in UI

---

## 🔗 Related Files

- `src/modules/chat/chat.store.ts`
- `src/modules/chat/ChatBox.vue`
- `src/modules/supervisor/SupervisorDashboard.vue`
- `src/modules/supervisor/AudioReview.vue`
- `src/views/SupervisorView.vue`

---

## 📚 References

- [Laravel Echo Channels](https://laravel.com/docs/broadcasting#presence-channels)
- [Audio HTML Element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/audio)
- [DaisyUI Cards](https://daisyui.com/components/card/)
