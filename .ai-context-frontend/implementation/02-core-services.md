# 02 - Core Services (API, Echo, Audio, Storage)

**Status**: [ ] Not Started | [ ] In Progress | [ ] Completed | [ ] Tested

---

## 📋 Overview

Implementación de servicios fundamentales que todos los módulos del juego necesitarán: cliente HTTP, WebSocket, sistema de audio de 3 canales, y almacenamiento local.

---

## 🎯 Objectives

- [ ] Implementar API Service (Axios wrapper)
- [ ] Implementar Echo Service (WebSocket client)
- [ ] Implementar Audio Service (3 canales + cola)
- [ ] Implementar Storage Service (localStorage wrapper)
- [ ] Implementar ElevenLabs Service (client for TTS)
- [ ] Crear composables para cada servicio

---

## 📁 Files to Create

```
src/modules/core/
├── services/
│   ├── api.service.ts          # HTTP client
│   ├── echo.service.ts         # WebSocket client
│   ├── audio.service.ts        # Audio system (3 channels)
│   ├── storage.service.ts      # LocalStorage wrapper
│   └── elevenlabs.service.ts   # TTS client (optional)
│
└── composables/
    ├── useApi.ts
    ├── useEcho.ts
    ├── useAudio.ts
    └── useStorage.ts
```

---

## 🔧 Implementation

### 1. API Service (`api.service.ts`)

```typescript
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

export class ApiService {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      withCredentials: true, // Important for CORS + cookies
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor: Add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error),
    )

    // Response interceptor: Handle errors globally
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Unauthorized: Clear token and redirect to login
          localStorage.removeItem('auth_token')
          window.location.href = '/'
        }
        return Promise.reject(error)
      },
    )
  }

  // Generic methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config)
    return response.data
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config)
    return response.data
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config)
    return response.data
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config)
    return response.data
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config)
    return response.data
  }
}

// Singleton instance
export const apiService = new ApiService()
```

**Checklist**:

- [ ] Create ApiService class
- [ ] Configure axios instance with base URL
- [ ] Add auth token interceptor
- [ ] Add error handling interceptor
- [ ] Implement generic HTTP methods
- [ ] Export singleton instance
- [ ] Test with backend endpoints

---

### 2. Echo Service (`echo.service.ts`)

```typescript
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

// Make Pusher available globally for Echo
declare global {
  interface Window {
    Pusher: typeof Pusher
  }
}
window.Pusher = Pusher

export class EchoService {
  private echo: Echo | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  initialize() {
    if (this.echo) {
      console.warn('[Echo] Already initialized')
      return this.echo
    }

    this.echo = new Echo({
      broadcaster: 'reverb',
      key: import.meta.env.VITE_REVERB_APP_KEY,
      wsHost: import.meta.env.VITE_REVERB_HOST || 'localhost',
      wsPort: import.meta.env.VITE_REVERB_PORT || 8080,
      wssPort: import.meta.env.VITE_REVERB_PORT || 8080,
      forceTLS: import.meta.env.VITE_REVERB_SCHEME === 'https',
      enabledTransports: ['ws', 'wss'],
      disableStats: true,
      authEndpoint: `${import.meta.env.VITE_API_URL}/broadcasting/auth`,
      auth: {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      },
    })

    this.setupConnectionListeners()

    console.log('[Echo] Initialized successfully')
    return this.echo
  }

  private setupConnectionListeners() {
    if (!this.echo) return

    // Connection established
    this.echo.connector.pusher.connection.bind('connected', () => {
      console.log('[Echo] Connected to WebSocket')
      this.reconnectAttempts = 0
    })

    // Connection disconnected
    this.echo.connector.pusher.connection.bind('disconnected', () => {
      console.warn('[Echo] Disconnected from WebSocket')
    })

    // Connection error
    this.echo.connector.pusher.connection.bind('error', (error: any) => {
      console.error('[Echo] Connection error:', error)
      this.handleReconnect()
    })

    // Connection state changes
    this.echo.connector.pusher.connection.bind('state_change', (states: any) => {
      console.log(`[Echo] State: ${states.previous} → ${states.current}`)
    })
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[Echo] Max reconnection attempts reached')
      // Emit event for UI to show "connection lost" modal
      window.dispatchEvent(new CustomEvent('echo:connection-failed'))
      return
    }

    this.reconnectAttempts++
    console.log(`[Echo] Reconnecting... Attempt ${this.reconnectAttempts}`)

    setTimeout(() => {
      this.disconnect()
      this.initialize()
    }, 2000 * this.reconnectAttempts) // Exponential backoff
  }

  getEcho(): Echo | null {
    return this.echo
  }

  disconnect() {
    if (this.echo) {
      this.echo.disconnect()
      this.echo = null
      console.log('[Echo] Disconnected')
    }
  }

  // Channel helpers
  listenToChannel(channelName: string) {
    if (!this.echo) {
      throw new Error('[Echo] Not initialized. Call initialize() first.')
    }
    return this.echo.channel(channelName)
  }

  listenToPrivateChannel(channelName: string) {
    if (!this.echo) {
      throw new Error('[Echo] Not initialized. Call initialize() first.')
    }
    return this.echo.private(channelName)
  }

  listenToPresenceChannel(channelName: string) {
    if (!this.echo) {
      throw new Error('[Echo] Not initialized. Call initialize() first.')
    }
    return this.echo.join(channelName)
  }

  leaveChannel(channelName: string) {
    if (this.echo) {
      this.echo.leave(channelName)
      console.log(`[Echo] Left channel: ${channelName}`)
    }
  }
}

// Singleton instance
export const echoService = new EchoService()
```

**Checklist**:

- [ ] Install laravel-echo and pusher-js
- [ ] Create EchoService class
- [ ] Configure Reverb connection
- [ ] Implement connection listeners
- [ ] Implement reconnection logic with exponential backoff
- [ ] Add channel helper methods
- [ ] Test connection to backend Reverb
- [ ] Test disconnect/reconnect scenarios

---

### 3. Audio Service (`audio.service.ts`)

```typescript
export type AudioChannel = 'music' | 'sfx' | 'voice'

export interface AudioTrack {
  id: string
  url: string
  channel: AudioChannel
  loop?: boolean
  volume?: number
}

export class AudioService {
  private context: AudioContext
  private channels: Map<AudioChannel, AudioChannelController>
  private voiceQueue: AudioTrack[] = []
  private isPlayingVoice = false

  // Default volumes per channel
  private defaultVolumes: Record<AudioChannel, number> = {
    music: 0.6,
    sfx: 0.8,
    voice: 1.0,
  }

  constructor() {
    this.context = new AudioContext()
    this.channels = new Map([
      ['music', new AudioChannelController(this.context, this.defaultVolumes.music)],
      ['sfx', new AudioChannelController(this.context, this.defaultVolumes.sfx)],
      ['voice', new AudioChannelController(this.context, this.defaultVolumes.voice)],
    ])

    // Resume context on user interaction (browser autoplay policy)
    this.setupAutoplayUnlock()
  }

  private setupAutoplayUnlock() {
    const unlock = () => {
      if (this.context.state === 'suspended') {
        this.context.resume()
      }
      document.removeEventListener('click', unlock)
      document.removeEventListener('touchstart', unlock)
    }
    document.addEventListener('click', unlock)
    document.addEventListener('touchstart', unlock)
  }

  async play(track: AudioTrack): Promise<void> {
    const channel = this.channels.get(track.channel)
    if (!channel) {
      console.error(`[Audio] Invalid channel: ${track.channel}`)
      return
    }

    // Voice channel uses queue to avoid overlap
    if (track.channel === 'voice') {
      this.voiceQueue.push(track)
      if (!this.isPlayingVoice) {
        await this.processVoiceQueue()
      }
      return
    }

    // Other channels play immediately
    await channel.play(track)
  }

  private async processVoiceQueue() {
    if (this.voiceQueue.length === 0) {
      this.isPlayingVoice = false
      return
    }

    this.isPlayingVoice = true
    const track = this.voiceQueue.shift()!
    const channel = this.channels.get('voice')!

    await channel.play(track)

    // Wait for audio to finish, then process next
    channel.onEnded(() => {
      this.processVoiceQueue()
    })
  }

  stop(channel: AudioChannel) {
    this.channels.get(channel)?.stop()
  }

  stopAll() {
    this.channels.forEach((channel) => channel.stop())
    this.voiceQueue = []
    this.isPlayingVoice = false
  }

  setVolume(channel: AudioChannel, volume: number) {
    this.channels.get(channel)?.setVolume(volume)
  }

  getVolume(channel: AudioChannel): number {
    return this.channels.get(channel)?.getVolume() ?? 0
  }

  async preload(urls: string[]): Promise<void> {
    const promises = urls.map((url) => this.loadAudioBuffer(url))
    await Promise.all(promises)
    console.log(`[Audio] Preloaded ${urls.length} tracks`)
  }

  private async loadAudioBuffer(url: string): Promise<AudioBuffer> {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    return await this.context.decodeAudioData(arrayBuffer)
  }
}

class AudioChannelController {
  private context: AudioContext
  private gainNode: GainNode
  private currentSource: AudioBufferSourceNode | null = null
  private currentBuffer: AudioBuffer | null = null
  private endedCallback: (() => void) | null = null

  constructor(context: AudioContext, volume: number) {
    this.context = context
    this.gainNode = context.createGain()
    this.gainNode.gain.value = volume
    this.gainNode.connect(context.destination)
  }

  async play(track: AudioTrack): Promise<void> {
    // Stop current if playing
    this.stop()

    try {
      // Load audio buffer
      const response = await fetch(track.url)
      const arrayBuffer = await response.arrayBuffer()
      this.currentBuffer = await this.context.decodeAudioData(arrayBuffer)

      // Create and configure source
      this.currentSource = this.context.createBufferSource()
      this.currentSource.buffer = this.currentBuffer
      this.currentSource.loop = track.loop ?? false

      // Apply track-specific volume if provided
      if (track.volume !== undefined) {
        this.gainNode.gain.value = track.volume
      }

      // Connect and play
      this.currentSource.connect(this.gainNode)
      this.currentSource.start(0)

      // Handle ended event
      this.currentSource.onended = () => {
        if (this.endedCallback) {
          this.endedCallback()
        }
      }

      console.log(`[Audio] Playing: ${track.id} on ${track.channel}`)
    } catch (error) {
      console.error(`[Audio] Failed to play track ${track.id}:`, error)
    }
  }

  stop() {
    if (this.currentSource) {
      try {
        this.currentSource.stop()
      } catch (e) {
        // Ignore if already stopped
      }
      this.currentSource.disconnect()
      this.currentSource = null
    }
  }

  setVolume(volume: number) {
    this.gainNode.gain.value = Math.max(0, Math.min(1, volume))
  }

  getVolume(): number {
    return this.gainNode.gain.value
  }

  onEnded(callback: () => void) {
    this.endedCallback = callback
  }
}

// Singleton instance
export const audioService = new AudioService()
```

**Checklist**:

- [ ] Create AudioService class with 3 channels
- [ ] Implement Web Audio API integration
- [ ] Implement voice queue (sequential playback)
- [ ] Implement preload functionality
- [ ] Add volume control per channel
- [ ] Add autoplay unlock for browser policies
- [ ] Create AudioChannelController class
- [ ] Test all channels independently
- [ ] Test voice queue with multiple tracks
- [ ] Test volume controls

---

### 4. Storage Service (`storage.service.ts`)

```typescript
export class StorageService {
  private prefix = 'ruleta_'

  set<T>(key: string, value: T): void {
    try {
      const serialized = JSON.stringify(value)
      localStorage.setItem(this.prefix + key, serialized)
    } catch (error) {
      console.error(`[Storage] Error saving ${key}:`, error)
    }
  }

  get<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = localStorage.getItem(this.prefix + key)
      if (item === null) {
        return defaultValue ?? null
      }
      return JSON.parse(item) as T
    } catch (error) {
      console.error(`[Storage] Error reading ${key}:`, error)
      return defaultValue ?? null
    }
  }

  remove(key: string): void {
    localStorage.removeItem(this.prefix + key)
  }

  clear(): void {
    const keys = Object.keys(localStorage)
    keys.forEach((key) => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key)
      }
    })
  }

  has(key: string): boolean {
    return localStorage.getItem(this.prefix + key) !== null
  }

  // Specific game data helpers
  savePlayerSession(session: any) {
    this.set('player_session', session)
  }

  getPlayerSession(): any {
    return this.get('player_session')
  }

  clearPlayerSession() {
    this.remove('player_session')
  }

  saveSettings(settings: any) {
    this.set('settings', settings)
  }

  getSettings(): any {
    return this.get('settings', {
      musicVolume: 0.6,
      sfxVolume: 0.8,
      voiceVolume: 1.0,
      language: 'es-CO',
    })
  }
}

// Singleton instance
export const storageService = new StorageService()
```

**Checklist**:

- [ ] Create StorageService class
- [ ] Implement get/set/remove/clear methods
- [ ] Add prefix to avoid key conflicts
- [ ] Add JSON serialization/deserialization
- [ ] Add error handling
- [ ] Create helper methods for common data
- [ ] Test with different data types

---

### 5. Composables

#### `useApi.ts`

```typescript
import { apiService } from '@/modules/core/services/api.service'

export function useApi() {
  return {
    get: apiService.get.bind(apiService),
    post: apiService.post.bind(apiService),
    put: apiService.put.bind(apiService),
    delete: apiService.delete.bind(apiService),
    patch: apiService.patch.bind(apiService),
  }
}
```

#### `useEcho.ts`

```typescript
import { onMounted, onUnmounted } from 'vue'
import { echoService } from '@/modules/core/services/echo.service'
import type { Channel } from 'laravel-echo'

export function useEcho() {
  return {
    channel: (name: string) => echoService.listenToChannel(name),
    private: (name: string) => echoService.listenToPrivateChannel(name),
    join: (name: string) => echoService.listenToPresenceChannel(name),
    leave: (name: string) => echoService.leaveChannel(name),
  }
}

// Helper for auto cleanup on unmount
export function useChannel(channelName: string) {
  let channel: Channel | null = null

  onMounted(() => {
    channel = echoService.listenToChannel(channelName)
  })

  onUnmounted(() => {
    if (channel) {
      echoService.leaveChannel(channelName)
    }
  })

  return { channel }
}
```

#### `useAudio.ts`

```typescript
import { onUnmounted } from 'vue'
import { audioService, type AudioTrack } from '@/modules/core/services/audio.service'

export function useAudio() {
  // Auto cleanup on component unmount
  onUnmounted(() => {
    // Optionally stop all audio when component unmounts
    // audioService.stopAll()
  })

  return {
    play: (track: AudioTrack) => audioService.play(track),
    stop: (channel: AudioTrack['channel']) => audioService.stop(channel),
    stopAll: () => audioService.stopAll(),
    setVolume: (channel: AudioTrack['channel'], volume: number) =>
      audioService.setVolume(channel, volume),
    getVolume: (channel: AudioTrack['channel']) => audioService.getVolume(channel),
    preload: (urls: string[]) => audioService.preload(urls),
  }
}
```

#### `useStorage.ts`

```typescript
import { storageService } from '@/modules/core/services/storage.service'

export function useStorage() {
  return {
    set: storageService.set.bind(storageService),
    get: storageService.get.bind(storageService),
    remove: storageService.remove.bind(storageService),
    clear: storageService.clear.bind(storageService),
    has: storageService.has.bind(storageService),

    // Shortcuts
    savePlayerSession: storageService.savePlayerSession.bind(storageService),
    getPlayerSession: storageService.getPlayerSession.bind(storageService),
    clearPlayerSession: storageService.clearPlayerSession.bind(storageService),
    saveSettings: storageService.saveSettings.bind(storageService),
    getSettings: storageService.getSettings.bind(storageService),
  }
}
```

**Checklist**:

- [ ] Create useApi composable
- [ ] Create useEcho composable with auto-cleanup
- [ ] Create useAudio composable with lifecycle
- [ ] Create useStorage composable
- [ ] Test composables in components
- [ ] Verify cleanup on unmount

---

## 🚀 Integration in `main.ts`

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { echoService } from '@/modules/core/services/echo.service'
import { audioService } from '@/modules/core/services/audio.service'

// Styles
import '@/assets/styles/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Initialize services
echoService.initialize()

// Preload critical audio assets
audioService.preload([
  '/assets/audio/sfx/ui/click.mp3',
  '/assets/audio/sfx/ui/tick.mp3',
  '/assets/audio/sfx/bomb/explode.mp3',
])

app.mount('#app')
```

**Checklist**:

- [ ] Initialize Echo service on app mount
- [ ] Preload critical audio assets
- [ ] Handle graceful cleanup on app unmount

---

## ✅ Acceptance Criteria

- [ ] ApiService makes successful HTTP requests to backend
- [ ] EchoService connects to Reverb WebSocket
- [ ] AudioService plays music, SFX, and voice on separate channels
- [ ] Voice queue prevents overlapping narrations
- [ ] StorageService saves/loads data from localStorage
- [ ] All composables work in Vue components
- [ ] Services cleanup properly on unmount
- [ ] Error handling works for all services
- [ ] Reconnection logic tested for Echo

---

## 🔗 Related Files

- `src/modules/core/services/api.service.ts`
- `src/modules/core/services/echo.service.ts`
- `src/modules/core/services/audio.service.ts`
- `src/modules/core/services/storage.service.ts`
- `src/modules/core/composables/useApi.ts`
- `src/modules/core/composables/useEcho.ts`
- `src/modules/core/composables/useAudio.ts`
- `src/modules/core/composables/useStorage.ts`
- `src/main.ts`

---

## 📚 References

- [Axios Documentation](https://axios-http.com/)
- [Laravel Echo Documentation](https://laravel.com/docs/broadcasting#client-side-installation)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [LocalStorage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
