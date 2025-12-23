import '@fontsource-variable/orbitron'
import '@/assets/styles/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from '@/App.vue'
import router from '@/router'
import axiosPlugin from '@/plugins/axios'

import { echoService } from '@/modules/core/services/echo.service'
import { audioService } from '@/modules/core/services/audio.service'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(axiosPlugin)

// Initialize background services
try {
  echoService.initialize()
} catch (e) {
  console.warn('[main] Echo init failed', e)
}

// Preload critical audio assets
audioService.preload([
  '/assets/audio/sfx/ui/click.mp3',
  '/assets/audio/sfx/ui/tick.mp3',
  '/assets/audio/sfx/bomb/explode.mp3',
])

// Mount the app after all plugins are registered
app.mount('#app')
