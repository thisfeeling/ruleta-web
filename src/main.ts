import '@fontsource-variable/orbitron'
import '@/assets/styles/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from '@/App.vue'
import router from '@/router'
import axiosPlugin from '@/plugins/axios'
import i18n from '@/plugins/i18n'

import { echoService } from '@/modules/core/services/echo.service'
import { audioService } from '@/modules/core/services/audio.service'
import { useAuthStore } from '@/modules/core/stores/auth.store'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(axiosPlugin)
app.use(i18n)

// Restore saved locale
try {
  const savedLocale = localStorage.getItem('locale') as 'es-CO' | 'en-US' | null
  if (savedLocale && ['es-CO', 'en-US'].includes(savedLocale)) {
    // `i18n.global.locale` may be a Ref or a plain string depending on the runtime types - assign safely
    const maybeLocale = (i18n.global as unknown as { locale?: string | import('vue').Ref<string> })
      .locale
    if (maybeLocale && typeof maybeLocale === 'object' && 'value' in maybeLocale) {
      // it's a Ref
      ;(maybeLocale as import('vue').Ref<string>).value = savedLocale
    } else {
      // plain assignment
      ;(i18n.global as unknown as { locale?: string }).locale = savedLocale
    }
  }
} catch {}

// Initialize background services
try {
  echoService.initialize()
  // Register global game socket listeners
  try {
    // lazy import to avoid circular deps during testing
    const { registerGameSocketListeners } = await import('@/modules/core/services/game.socket')
    registerGameSocketListeners()

    // Register player-specific socket listeners
    try {
      const { registerPlayerSocketListeners } = await import('@/modules/player/player.socket')
      registerPlayerSocketListeners()
    } catch (err) {
      console.warn('[main] Failed to register player socket listeners', err)
    }
  } catch (e) {
    console.warn('[main] Failed to register game socket listeners', e)
  }
} catch (e) {
  // Non-fatal: If Reverb isn't running during local dev/preview, initialize() may fail.
  // Log at debug level to avoid alarming end-users while keeping the info for devs.
   
  console.debug('[main] Echo init failed', e)
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
