# 04 - Router & i18n Setup

**Status**: [ ] Not Started | [ ] In Progress | [ ] Completed | [ ] Tested

---

## 📋 Overview

Configuración de Vue Router para navegación y vue-i18n para internacionalización (es-CO/en-US).

---

## 🎯 Objectives

- [ ] Configurar Vue Router con lazy loading
- [ ] Definir rutas principales (Home, Lobby, Game, Supervisor)
- [ ] Implementar guards de navegación (auth check)
- [ ] Configurar vue-i18n con español e inglés
- [ ] Crear componente LanguageSwitcher
- [ ] Poblar archivos de traducción

---

## 📁 Files to Create

```
src/
├── router/
│   └── index.ts
│
├── locales/
│   ├── es-CO.json
│   └── en-US.json
│
├── plugins/
│   └── i18n.ts
│
└── ui/components/
    └── LanguageSwitcher.vue
```

---

## 🔧 Implementation

### 1. Router (`router/index.ts`)

```typescript
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/modules/core/stores/auth.store'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/lobby',
    name: 'lobby',
    component: () => import('@/views/LobbyView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/game',
    name: 'game',
    component: () => import('@/views/GameView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/supervisor',
    name: 'supervisor',
    component: () => import('@/views/SupervisorView.vue'),
    meta: { requiresAuth: true, requiresSupervisor: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Navigation guard
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  // Check if route requires auth
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    console.warn('[Router] Auth required, redirecting to home')
    return next({ name: 'home' })
  }

  // Check if route requires supervisor
  if (to.meta.requiresSupervisor && !authStore.isSupervisor) {
    console.warn('[Router] Supervisor required, redirecting to lobby')
    return next({ name: 'lobby' })
  }

  next()
})

export default router
```

**Checklist**:

- [ ] Create router instance with history mode
- [ ] Define all routes with lazy loading
- [ ] Add meta fields for auth requirements
- [ ] Implement beforeEach navigation guard
- [ ] Test navigation between routes
- [ ] Test auth guard redirects
- [ ] Test supervisor guard

---

### 2. i18n Plugin (`plugins/i18n.ts`)

```typescript
import { createI18n } from 'vue-i18n'
import esC O from '@/locales/es-CO.json'
import enUS from '@/locales/en-US.json'

export type MessageSchema = typeof esCO

const i18n = createI18n<[MessageSchema], 'es-CO' | 'en-US'>({
  legacy: false, // Use Composition API mode
  locale: 'es-CO', // Default locale
  fallbackLocale: 'en-US',
  messages: {
    'es-CO': esCO,
    'en-US': enUS
  },
  globalInjection: true,
  missingWarn: false,
  fallbackWarn: false
})

export default i18n
```

**Checklist**:

- [ ] Install vue-i18n
- [ ] Create i18n instance with Composition API mode
- [ ] Set es-CO as default locale
- [ ] Import locale JSON files
- [ ] Export i18n instance

---

### 3. Locale Files

#### `locales/es-CO.json` (Español Colombia)

```json
{
  "common": {
    "welcome": "Bienvenidos",
    "start": "Iniciar",
    "continue": "Continuar",
    "cancel": "Cancelar",
    "confirm": "Confirmar",
    "close": "Cerrar",
    "save": "Guardar",
    "loading": "Cargando...",
    "error": "Error",
    "success": "Éxito"
  },
  "narrator": {
    "welcome": "¡Bienvenidos a Ruleta Familiar!",
    "gameStarting": "El juego está por comenzar...",
    "playerEliminated": "El jugador {nickname} ha sido eliminado",
    "playerPassed": "¡{nickname} avanza a la siguiente ronda!",
    "finalRound": "¡Llegamos a la ronda final!",
    "winner": "¡Tenemos un ganador! ¡Felicidades {nickname}!"
  },
  "lobby": {
    "title": "Sala de Espera",
    "waitingForPlayers": "Esperando jugadores...",
    "playersOnline": "{count} jugadores conectados",
    "gameCode": "Código del juego",
    "joinGame": "Unirse al juego",
    "nickname": "Apodo",
    "selectColor": "Seleccionar color",
    "playerNumber": "Jugador #{number}"
  },
  "games": {
    "millionaire": {
      "title": "Juego del Millonario",
      "question": "Pregunta",
      "timeLeft": "Tiempo restante",
      "answer": "Responder",
      "correct": "¡Correcto!",
      "incorrect": "Incorrecto",
      "eliminated": "Has sido eliminado"
    },
    "rope": {
      "title": "La Cuerda",
      "tension": "Tensión",
      "click": "Hacer clic",
      "groupEliminated": "Tu grupo ha sido eliminado",
      "groupPassed": "¡Tu grupo avanzó!"
    },
    "spell": {
      "title": "Deletréalo",
      "word": "Palabra",
      "record": "Grabar",
      "submit": "Enviar",
      "waiting": "Esperando validación...",
      "correct": "¡Correcto!",
      "incorrect": "Incorrecto",
      "bombExploded": "¡La bomba explotó!"
    },
    "roulette": {
      "title": "La Ruleta",
      "spin": "Girar",
      "spinning": "Girando...",
      "result": "Resultado",
      "winner": "¡Ganador!",
      "loser": "Eliminado"
    },
    "wordSearch": {
      "title": "¡A Buscar!",
      "wordsToFind": "Palabras por encontrar",
      "wordsFound": "Palabras encontradas",
      "timeLeft": "Tiempo restante",
      "completed": "¡Completado!",
      "bonus": "Juego Bonus - No elimina jugadores"
    },
    "flappy": {
      "title": "No Lo Choques",
      "start": "Iniciar",
      "gameOver": "Juego Terminado",
      "score": "Puntuación",
      "highScore": "Mejor puntuación",
      "bonus": "Juego Bonus - No elimina jugadores"
    }
  },
  "player": {
    "you": "Tú",
    "alive": "Vivo",
    "eliminated": "Eliminado",
    "reconnect": "Reconectar",
    "enterPin": "Ingresa tu PIN",
    "selectPlayer": "Selecciona tu jugador"
  },
  "supervisor": {
    "title": "Panel de Supervisor",
    "controls": "Controles",
    "startGame": "Iniciar juego",
    "nextRound": "Siguiente ronda",
    "endGame": "Terminar juego",
    "pauseGame": "Pausar",
    "resumeGame": "Reanudar",
    "validateAudio": "Validar audio",
    "approve": "Aprobar",
    "reject": "Rechazar",
    "pendingValidations": "Validaciones pendientes",
    "playersTimeline": "Línea de tiempo",
    "startBonusGame": "Iniciar juego bonus"
  },
  "scoreboard": {
    "title": "Puntuaciones",
    "rank": "Posición",
    "player": "Jugador",
    "score": "Puntos",
    "total": "Total"
  },
  "chat": {
    "title": "Chat",
    "sendMessage": "Enviar mensaje",
    "placeholder": "Escribe un mensaje...",
    "systemMessage": "Mensaje del sistema"
  },
  "achievements": {
    "unlocked": "¡Logro desbloqueado!",
    "firstBlood": "Primera Sangre",
    "survivor": "Superviviente",
    "speedDemon": "Demonio de la Velocidad",
    "perfectScore": "Puntuación Perfecta",
    "comeback": "Regreso Triunfal"
  },
  "ui": {
    "musicVolume": "Volumen de música",
    "sfxVolume": "Volumen de efectos",
    "voiceVolume": "Volumen de voz",
    "settings": "Configuración",
    "language": "Idioma"
  },
  "errors": {
    "connectionLost": "Conexión perdida",
    "reconnecting": "Reconectando...",
    "failedToJoin": "No se pudo unir al juego",
    "invalidPin": "PIN inválido",
    "sessionExpired": "Sesión expirada",
    "serverError": "Error del servidor"
  },
  "time": {
    "seconds": "{count} segundos",
    "minutes": "{count} minutos",
    "timeUp": "¡Se acabó el tiempo!"
  }
}
```

#### `locales/en-US.json` (English US)

```json
{
  "common": {
    "welcome": "Welcome",
    "start": "Start",
    "continue": "Continue",
    "cancel": "Cancel",
    "confirm": "Confirm",
    "close": "Close",
    "save": "Save",
    "loading": "Loading...",
    "error": "Error",
    "success": "Success"
  },
  "narrator": {
    "welcome": "Welcome to Family Wheel!",
    "gameStarting": "The game is about to begin...",
    "playerEliminated": "Player {nickname} has been eliminated",
    "playerPassed": "{nickname} advances to the next round!",
    "finalRound": "We've reached the final round!",
    "winner": "We have a winner! Congratulations {nickname}!"
  },
  "lobby": {
    "title": "Waiting Room",
    "waitingForPlayers": "Waiting for players...",
    "playersOnline": "{count} players online",
    "gameCode": "Game code",
    "joinGame": "Join game",
    "nickname": "Nickname",
    "selectColor": "Select color",
    "playerNumber": "Player #{number}"
  },
  "games": {
    "millionaire": {
      "title": "Millionaire Game",
      "question": "Question",
      "timeLeft": "Time left",
      "answer": "Answer",
      "correct": "Correct!",
      "incorrect": "Incorrect",
      "eliminated": "You have been eliminated"
    },
    "rope": {
      "title": "The Rope",
      "tension": "Tension",
      "click": "Click",
      "groupEliminated": "Your group has been eliminated",
      "groupPassed": "Your group advanced!"
    },
    "spell": {
      "title": "Spell It",
      "word": "Word",
      "record": "Record",
      "submit": "Submit",
      "waiting": "Waiting for validation...",
      "correct": "Correct!",
      "incorrect": "Incorrect",
      "bombExploded": "The bomb exploded!"
    },
    "roulette": {
      "title": "The Wheel",
      "spin": "Spin",
      "spinning": "Spinning...",
      "result": "Result",
      "winner": "Winner!",
      "loser": "Eliminated"
    },
    "wordSearch": {
      "title": "Word Hunt!",
      "wordsToFind": "Words to find",
      "wordsFound": "Words found",
      "timeLeft": "Time left",
      "completed": "Completed!",
      "bonus": "Bonus Game - Non-elimination"
    },
    "flappy": {
      "title": "Don't Crash",
      "start": "Start",
      "gameOver": "Game Over",
      "score": "Score",
      "highScore": "High Score",
      "bonus": "Bonus Game - Non-elimination"
    }
  },
  "player": {
    "you": "You",
    "alive": "Alive",
    "eliminated": "Eliminated",
    "reconnect": "Reconnect",
    "enterPin": "Enter your PIN",
    "selectPlayer": "Select your player"
  },
  "supervisor": {
    "title": "Supervisor Panel",
    "controls": "Controls",
    "startGame": "Start game",
    "nextRound": "Next round",
    "endGame": "End game",
    "pauseGame": "Pause",
    "resumeGame": "Resume",
    "validateAudio": "Validate audio",
    "approve": "Approve",
    "reject": "Reject",
    "pendingValidations": "Pending validations",
    "playersTimeline": "Timeline",
    "startBonusGame": "Start bonus game"
  },
  "scoreboard": {
    "title": "Scores",
    "rank": "Rank",
    "player": "Player",
    "score": "Score",
    "total": "Total"
  },
  "chat": {
    "title": "Chat",
    "sendMessage": "Send message",
    "placeholder": "Type a message...",
    "systemMessage": "System message"
  },
  "achievements": {
    "unlocked": "Achievement unlocked!",
    "firstBlood": "First Blood",
    "survivor": "Survivor",
    "speedDemon": "Speed Demon",
    "perfectScore": "Perfect Score",
    "comeback": "Comeback"
  },
  "ui": {
    "musicVolume": "Music volume",
    "sfxVolume": "Effects volume",
    "voiceVolume": "Voice volume",
    "settings": "Settings",
    "language": "Language"
  },
  "errors": {
    "connectionLost": "Connection lost",
    "reconnecting": "Reconnecting...",
    "failedToJoin": "Failed to join game",
    "invalidPin": "Invalid PIN",
    "sessionExpired": "Session expired",
    "serverError": "Server error"
  },
  "time": {
    "seconds": "{count} seconds",
    "minutes": "{count} minutes",
    "timeUp": "Time's up!"
  }
}
```

**Checklist**:

- [ ] Create es-CO.json with all Spanish translations
- [ ] Create en-US.json with all English translations
- [ ] Organize translations by namespace
- [ ] Add placeholder support ({nickname}, {count}, etc.)
- [ ] Review translations for Colombian Spanish tone
- [ ] Add more translations as features are implemented

---

### 4. Language Switcher Component

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

const { locale, availableLocales } = useI18n()

const currentLocale = computed({
  get: () => locale.value,
  set: (value) => {
    locale.value = value
    localStorage.setItem('locale', value)
  },
})

const localeNames: Record<string, string> = {
  'es-CO': '🇨🇴 Español',
  'en-US': '🇺🇸 English',
}
</script>

<template>
  <div class="language-switcher">
    <select v-model="currentLocale" class="select select-bordered select-sm">
      <option v-for="loc in availableLocales" :key="loc" :value="loc">
        {{ localeNames[loc] || loc }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.language-switcher {
  display: inline-block;
}
</style>
```

**Checklist**:

- [ ] Create LanguageSwitcher component
- [ ] Use vue-i18n composable
- [ ] Save selected locale to localStorage
- [ ] Add flag emojis for visual identification
- [ ] Test language switching
- [ ] Verify all translations update reactively

---

## 🚀 Integration in `main.ts`

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import i18n from './plugins/i18n'

// Services
import { echoService } from '@/modules/core/services/echo.service'
import { audioService } from '@/modules/core/services/audio.service'

// Styles
import '@/assets/styles/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n) // Add i18n plugin

// Initialize services
echoService.initialize()

// Restore saved locale
const savedLocale = localStorage.getItem('locale')
if (savedLocale && ['es-CO', 'en-US'].includes(savedLocale)) {
  i18n.global.locale.value = savedLocale as 'es-CO' | 'en-US'
}

// Preload critical audio
audioService.preload(['/assets/audio/sfx/ui/click.mp3', '/assets/audio/sfx/ui/tick.mp3'])

app.mount('#app')
```

---

## 🧪 Usage in Components

### Using Composition API

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div>
    <h1>{{ t('lobby.title') }}</h1>
    <p>{{ t('lobby.playersOnline', { count: 10 }) }}</p>
    <button>{{ t('common.start') }}</button>
  </div>
</template>
```

### Using Options API

```vue
<script lang="ts">
export default {
  methods: {
    showMessage() {
      alert(this.$t('common.welcome'))
    },
  },
}
</script>

<template>
  <div>
    <p>{{ $t('narrator.welcome') }}</p>
  </div>
</template>
```

---

## ✅ Acceptance Criteria

- [ ] Router configured with lazy loading
- [ ] Auth guards prevent unauthorized access
- [ ] Supervisor guard works correctly
- [ ] i18n plugin installed and configured
- [ ] Both locales (es-CO, en-US) loaded
- [ ] Language switcher works and persists selection
- [ ] All translations used in components update reactively
- [ ] Placeholder interpolation works ({nickname}, {count})
- [ ] Missing translation warnings suppressed in production

---

## 🔗 Related Files

- `src/router/index.ts`
- `src/plugins/i18n.ts`
- `src/locales/es-CO.json`
- `src/locales/en-US.json`
- `src/ui/components/LanguageSwitcher.vue`
- `src/main.ts`

---

## 📚 References

- [Vue Router Documentation](https://router.vuejs.org/)
- [Vue I18n Documentation](https://vue-i18n.intlify.dev/)
- [Navigation Guards](https://router.vuejs.org/guide/advanced/navigation-guards.html)
- [I18n Composition API](https://vue-i18n.intlify.dev/guide/advanced/composition.html)
