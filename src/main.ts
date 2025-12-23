import '@fontsource-variable/orbitron'
import '@/assets/styles/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from '@/App.vue'
import router from '@/router'
import axiosPlugin from '@/plugins/axios'

import { echoService } from '@/modules/core/services/echo.service'
import { audioService } from '@/modules/core/services/audio.service'
import { useAuthStore } from '@/modules/core/stores/auth.store'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(axiosPlugin)

// Initialize background services
try {
  echoService.initialize()
  // Register global game socket listeners
  try {
    // lazy import to avoid circular deps during testing
    const { registerGameSocketListeners } = await import('@/modules/core/services/game.socket')
    registerGameSocketListeners()
  } catch (e) {
    console.warn('[main] Failed to register game socket listeners', e)
  }
} catch (e) {
  console.warn('[main] Echo init failed', e)
}

// Preload critical audio assets
audioService.preload([
  '/assets/audio/sfx/ui/click.mp3',
  '/assets/audio/sfx/ui/tick.mp3',
  '/assets/audio/sfx/bomb/explode.mp3',
])

// Restore session if available
try {
  const authStore = useAuthStore()
  authStore.restoreSession()
} catch {
  // pinia may not be ready in edge cases; ignore
}

// Mount the app after all plugins are registered
app.mount('#app')
