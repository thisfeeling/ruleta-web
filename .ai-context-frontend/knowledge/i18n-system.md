# Sistema de Internacionalización (i18n)

## Descripción General

Sistema completo de internacionalización utilizando **vue-i18n** para soportar múltiples idiomas en la plataforma. Inicialmente incluye **Español Colombiano (es-CO)** como idioma principal y **English US (en-US)** como alternativa. El sistema permite cambiar el idioma en tiempo real y persiste la preferencia del usuario.

**Características:**

- Soporte para 2 idiomas: es-CO (predeterminado) y en-US
- Cambio de idioma en tiempo real sin recargar
- Persistencia de preferencia en localStorage
- Componente LanguageSwitcher en barra de estado
- Fallback inteligente (es-CO → en-US → key)
- Interpolación de variables dinámicas
- Pluralización automática
- Formato de fechas/números localizados
- Lazy loading de locales (futuro)

---

## Instalación de vue-i18n

### Instalar dependencia

```bash
npm install vue-i18n@11
```

---

## Configuración del Plugin

**Ubicación:** `src/plugins/i18n.ts`

```typescript
import { createI18n } from 'vue-i18n'
import esMessages from '@/locales/es-CO.json'
import enMessages from '@/locales/en-US.json'

// Tipo para los mensajes
type MessageSchema = typeof esMessages

// Detectar idioma del navegador o usar localStorage
function getDefaultLocale(): string {
  const savedLocale = localStorage.getItem('locale')
  if (savedLocale && ['es-CO', 'en-US'].includes(savedLocale)) {
    return savedLocale
  }

  const browserLang = navigator.language
  if (browserLang.startsWith('es')) return 'es-CO'
  if (browserLang.startsWith('en')) return 'en-US'

  return 'es-CO' // Fallback predeterminado
}

const i18n = createI18n<[MessageSchema], 'es-CO' | 'en-US'>({
  legacy: false, // Usar Composition API
  locale: getDefaultLocale(),
  fallbackLocale: 'es-CO',
  messages: {
    'es-CO': esMessages,
    'en-US': enMessages,
  },
  datetimeFormats: {
    'es-CO': {
      short: {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      },
      long: {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
        hour: 'numeric',
        minute: 'numeric',
      },
    },
    'en-US': {
      short: {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      },
      long: {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
        hour: 'numeric',
        minute: 'numeric',
      },
    },
  },
  numberFormats: {
    'es-CO': {
      currency: {
        style: 'currency',
        currency: 'COP',
        notation: 'standard',
      },
      decimal: {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
      percent: {
        style: 'percent',
        useGrouping: false,
      },
    },
    'en-US': {
      currency: {
        style: 'currency',
        currency: 'USD',
        notation: 'standard',
      },
      decimal: {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
      percent: {
        style: 'percent',
        useGrouping: false,
      },
    },
  },
})

export default i18n
```

---

## Registrar en main.ts

**Ubicación:** `src/main.ts`

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import i18n from './plugins/i18n' // ← Importar plugin

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n) // ← Registrar antes de mount

app.mount('#app')
```

---

## Componente LanguageSwitcher

**Ubicación:** `src/ui/components/hud/LanguageSwitcher.vue`

### Características

- Dropdown compacto con banderas
- Posición: Esquina superior derecha (status bar)
- Persiste preferencia en localStorage
- Emite evento para analytics/audits

### Template

```vue
<template>
  <div class="dropdown dropdown-end">
    <label tabindex="0" class="btn btn-ghost btn-sm gap-2">
      <!-- Bandera del idioma actual -->
      <span class="text-xl">{{ currentFlag }}</span>
      <span class="hidden sm:inline text-xs font-medium">
        {{ currentLanguageName }}
      </span>
      <Icon name="mdi:chevron-down" class="w-4 h-4" />
    </label>

    <ul
      tabindex="0"
      class="dropdown-content z-50 menu p-2 shadow-lg bg-base-100 rounded-box w-52 border border-base-300"
    >
      <li v-for="lang in availableLanguages" :key="lang.code">
        <a
          class="flex items-center gap-3"
          :class="{ active: locale === lang.code }"
          @click="changeLanguage(lang.code)"
        >
          <span class="text-2xl">{{ lang.flag }}</span>
          <div class="flex-1">
            <p class="font-medium">{{ lang.name }}</p>
            <p class="text-xs text-base-content/60">{{ lang.nativeName }}</p>
          </div>
          <Icon v-if="locale === lang.code" name="mdi:check" class="w-5 h-5 text-success" />
        </a>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiService } from '@/modules/core/services/api.service'

const { locale, t } = useI18n()

interface Language {
  code: string
  name: string
  nativeName: string
  flag: string
}

const availableLanguages: Language[] = [
  {
    code: 'es-CO',
    name: 'Spanish (Colombia)',
    nativeName: 'Español (Colombia)',
    flag: '🇨🇴',
  },
  {
    code: 'en-US',
    name: 'English (US)',
    nativeName: 'English (US)',
    flag: '🇺🇸',
  },
]

const currentFlag = computed(() => {
  return availableLanguages.find((lang) => lang.code === locale.value)?.flag ?? '🌐'
})

const currentLanguageName = computed(() => {
  return availableLanguages.find((lang) => lang.code === locale.value)?.name ?? 'Language'
})

async function changeLanguage(newLocale: string) {
  if (locale.value === newLocale) return

  // Update locale
  locale.value = newLocale as 'es-CO' | 'en-US'

  // Save to localStorage
  localStorage.setItem('locale', newLocale)

  // Send audit event (optional)
  try {
    await apiService.post('/api/audit/language-changed', {
      from: locale.value,
      to: newLocale,
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error('Failed to log language change:', error)
  }
}
</script>
```

---

## Uso en Componentes Vue

### Composition API (script setup)

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t, locale, d, n } = useI18n()

// Cambiar idioma
function switchToEnglish() {
  locale.value = 'en-US'
}
</script>

<template>
  <div>
    <!-- Traducción simple -->
    <h1>{{ t('narrator.welcome') }}</h1>

    <!-- Traducción con interpolación -->
    <p>{{ t('game.playerCount', { count: 10 }) }}</p>

    <!-- Pluralización -->
    <p>{{ t('game.eliminatedPlayers', 3) }}</p>

    <!-- Formato de fecha -->
    <p>{{ d(new Date(), 'long') }}</p>

    <!-- Formato de número -->
    <p>{{ n(1234.56, 'currency') }}</p>
  </div>
</template>
```

### Options API (legacy)

```vue
<script>
export default {
  methods: {
    greeting() {
      return this.$t('narrator.welcome')
    },
  },
}
</script>

<template>
  <h1>{{ $t('narrator.welcome') }}</h1>
</template>
```

---

## Estructura de Archivos de Localización

### es-CO.json (Español Colombiano)

**Ubicación:** `src/locales/es-CO.json`

```json
{
  "narrator": {
    "welcome": "¡Ajá, parcero! Bienvenido a Ruleta Familiar",
    "gameStart": "¡Esto está que arde! ¿Listos para el desafío?",
    "roundStart": "¡Ombe, se puso piloso! Comienza la ronda {roundNumber}",
    "roundEnd": "¡Qué tiradera! Ronda {roundNumber} finalizada",
    "elimination": "¡Paila! {playerName} quedó eliminado",
    "winner": "¡Fino, parcero! {playerName} se llevó la victoria",
    "countdown": "¡En {seconds} segundos comienza la batalla!",
    "hurryUp": "¡Apúrense que se acaba el tiempo!",
    "timeUp": "¡Se acabó el tiempo, parcero!"
  },
  "games": {
    "millionaire": {
      "title": "Millonario",
      "description": "Responde preguntas antes que el tiempo se acabe",
      "jokerUsed": "¡Joker 50:50 activado!",
      "correctAnswer": "¡Correcto, parcero!",
      "wrongAnswer": "¡Uy no, esa no era!",
      "instructions": {
        "slide1": {
          "title": "Bienvenido a Millonario",
          "description": "Responde 10 preguntas de cultura general en 3 minutos. ¡El tiempo corre!"
        },
        "slide2": {
          "title": "¿Cómo se juega?",
          "description": "Lee la pregunta y selecciona una de las 4 opciones.",
          "item1": "10 preguntas en 3 minutos",
          "item2": "Cada respuesta correcta suma puntos",
          "item3": "Los jugadores con menos puntos quedan eliminados"
        },
        "slide3": {
          "title": "Joker 50:50",
          "description": "Elimina dos opciones incorrectas si te trabas.",
          "item1": "Elimina 2 respuestas incorrectas",
          "item2": "Máximo 4 usos por partida",
          "tip": "¡Úsalo sabiamente! Una vez se gasta, no vuelve."
        }
      }
    },
    "rope": {
      "title": "Jala la Cuerda",
      "description": "Compite en equipos jalando la cuerda virtual",
      "teamFormed": "¡Equipo {teamName} formado!",
      "battleStart": "¡Comienza el duelo entre {team1} y {team2}!",
      "victory": "¡{teamName} ganó el duelo!",
      "instructions": {
        "slide1": {
          "title": "Jala la Cuerda",
          "description": "Forma equipos y compite en duelos de clicks"
        },
        "slide2": {
          "title": "Formación de Equipos",
          "description": "Se organizan en grupos de 5 jugadores",
          "item1": "Grupos de 5 jugadores",
          "item2": "Votan nombre del equipo",
          "item3": "Duelos uno contra uno"
        },
        "slide3": {
          "title": "¡A jalar!",
          "description": "Haz click lo más rápido posible para ganar",
          "tip": "¡Cuidado! No hagas spam o te descalifican."
        }
      }
    },
    "spell": {
      "title": "Deletreo",
      "description": "Escribe la palabra correctamente antes que explote",
      "wordShown": "Memoriza esta palabra: {word}",
      "correctSpelling": "¡Perfecto, parcero!",
      "wrongSpelling": "¡Uy, te equivocaste!",
      "explosion": "¡Boom! La bomba explotó",
      "instructions": {
        "slide1": {
          "title": "Deletreo de Bomba",
          "description": "Memoriza y escribe palabras antes que el tiempo se acabe"
        },
        "slide2": {
          "title": "¿Cómo funciona?",
          "description": "Tienes 5 segundos para memorizar la palabra",
          "item1": "Memoriza la palabra en 5 segundos",
          "item2": "Escribe letra por letra",
          "item3": "Sin corrector, sin borrar"
        },
        "slide3": {
          "title": "Cuidado con la Bomba",
          "description": "Si te demoras mucho, explota",
          "tip": "¡Escribe rápido pero sin errores!"
        }
      }
    },
    "roulette": {
      "title": "Ruleta",
      "description": "Responde preguntas de categorías aleatorias",
      "categorySpun": "¡La ruleta cayó en {category}!",
      "questionTime": "Pregunta de {category}",
      "instructions": {
        "slide1": {
          "title": "Ruleta de Preguntas",
          "description": "La ruleta decide la categoría de cada ronda"
        },
        "slide2": {
          "title": "Dinámica",
          "description": "Cada ronda tiene una categoría diferente",
          "item1": "Categoría aleatoria por ronda",
          "item2": "Responde rápido para sumar puntos",
          "item3": "Los lentos quedan eliminados"
        }
      }
    },
    "wordSearch": {
      "title": "Sopa de Letras",
      "description": "Encuentra todas las palabras ocultas",
      "wordFound": "¡Palabra encontrada: {word}!",
      "allWordsFound": "¡Completaste la sopa!",
      "instructions": {
        "slide1": {
          "title": "Sopa de Letras",
          "description": "Encuentra 12 palabras ocultas en la cuadrícula"
        },
        "slide2": {
          "title": "¿Cómo jugar?",
          "description": "Arrastra el mouse sobre las letras para seleccionar",
          "item1": "12 palabras ocultas",
          "item2": "Arrastra para seleccionar",
          "item3": "Los más rápidos suman más puntos",
          "tip": "¡Las palabras pueden estar en cualquier dirección!"
        }
      }
    },
    "flappy": {
      "title": "Flappy Bird",
      "description": "Vuela sin chocar con los obstáculos",
      "gameOver": "¡Chocaste! Puntuación: {score}",
      "newRecord": "¡Nuevo récord: {score}!",
      "instructions": {
        "slide1": {
          "title": "Flappy Bird",
          "description": "Vuela lo más lejos posible sin chocar"
        },
        "slide2": {
          "title": "Controles",
          "description": "Presiona ESPACIO para volar hacia arriba",
          "item1": "ESPACIO para volar",
          "item2": "Evita los tubos",
          "item3": "Sobrevive el mayor tiempo posible",
          "tip": "¡Timing es todo! No vueles muy alto ni muy bajo."
        }
      }
    }
  },
  "achievements": {
    "unlocked": "¡Logro desbloqueado!",
    "newAchievement": "Obtuviste: {achievementName}",
    "firstBlood": "Primera Sangre",
    "firstBloodDesc": "Juega tu primera partida",
    "survivor": "Superviviente",
    "survivorDesc": "Sobrevive 3 rondas consecutivas",
    "champion": "Campeón",
    "championDesc": "Gana tu primera partida",
    "speedster": "Veloz",
    "speedsterDesc": "Responde 5 preguntas en menos de 10 segundos",
    "perfectionist": "Perfeccionista",
    "perfectionistDesc": "Responde 10 preguntas seguidas correctamente"
  },
  "ui": {
    "loading": "Cargando...",
    "connecting": "Conectando al servidor...",
    "connected": "¡Conectado!",
    "disconnected": "Desconectado del servidor",
    "reconnecting": "Reconectando...",
    "waiting": "Esperando jugadores...",
    "ready": "¡Listo!",
    "start": "Iniciar",
    "cancel": "Cancelar",
    "close": "Cerrar",
    "confirm": "Confirmar",
    "back": "Volver",
    "next": "Siguiente",
    "previous": "Anterior",
    "finish": "Finalizar",
    "submit": "Enviar",
    "skip": "Saltar"
  },
  "errors": {
    "connectionLost": "Se perdió la conexión con el servidor",
    "invalidAnswer": "Respuesta inválida",
    "timeExpired": "El tiempo se agotó",
    "serverError": "Error del servidor. Intenta de nuevo.",
    "notFound": "No se encontró el recurso",
    "unauthorized": "No tienes permiso para hacer esto"
  },
  "audio": {
    "soundtrack": "Música",
    "effect": "Efecto",
    "voice": "Voz",
    "ambience": "Ambiente"
  },
  "instructions": {
    "subtitle": "Lee las instrucciones antes de comenzar",
    "previous": "Anterior",
    "next": "Siguiente",
    "understood": "Entendido",
    "skipFuture": "No mostrar de nuevo"
  },
  "supervisor": {
    "dashboard": "Panel de Control",
    "startGame": "Iniciar Juego",
    "pauseGame": "Pausar Juego",
    "endGame": "Finalizar Juego",
    "kickPlayer": "Expulsar Jugador",
    "mutePlayer": "Silenciar Jugador",
    "forceInstructions": "Mostrar Instrucciones",
    "uploadSoundtrack": "Subir Música",
    "viewAudits": "Ver Auditoría"
  }
}
```

### en-US.json (English US)

**Ubicación:** `src/locales/en-US.json`

```json
{
  "narrator": {
    "welcome": "Hey there! Welcome to Ruleta Familiar",
    "gameStart": "This is getting intense! Ready for the challenge?",
    "roundStart": "Oh boy, it's getting tough! Round {roundNumber} begins",
    "roundEnd": "What a show! Round {roundNumber} completed",
    "elimination": "Oh no! {playerName} has been eliminated",
    "winner": "Nice job! {playerName} takes the victory",
    "countdown": "Starting in {seconds} seconds!",
    "hurryUp": "Hurry up, time is running out!",
    "timeUp": "Time's up!"
  },
  "games": {
    "millionaire": {
      "title": "Millionaire",
      "description": "Answer questions before time runs out",
      "jokerUsed": "50:50 Joker activated!",
      "correctAnswer": "Correct!",
      "wrongAnswer": "Wrong answer!",
      "instructions": {
        "slide1": {
          "title": "Welcome to Millionaire",
          "description": "Answer 10 trivia questions in 3 minutes. Time is ticking!"
        },
        "slide2": {
          "title": "How to Play?",
          "description": "Read the question and select one of the 4 options.",
          "item1": "10 questions in 3 minutes",
          "item2": "Each correct answer adds points",
          "item3": "Players with lowest scores are eliminated"
        },
        "slide3": {
          "title": "50:50 Joker",
          "description": "Remove two incorrect options if you're stuck.",
          "item1": "Eliminates 2 wrong answers",
          "item2": "Maximum 4 uses per game",
          "tip": "Use it wisely! Once spent, it's gone."
        }
      }
    },
    "rope": {
      "title": "Tug of War",
      "description": "Compete in teams pulling the virtual rope",
      "teamFormed": "Team {teamName} formed!",
      "battleStart": "Battle begins between {team1} and {team2}!",
      "victory": "{teamName} won the duel!",
      "instructions": {
        "slide1": {
          "title": "Tug of War",
          "description": "Form teams and compete in click battles"
        },
        "slide2": {
          "title": "Team Formation",
          "description": "Organize into groups of 5 players",
          "item1": "Groups of 5 players",
          "item2": "Vote for team name",
          "item3": "One-on-one duels"
        },
        "slide3": {
          "title": "Let's Pull!",
          "description": "Click as fast as possible to win",
          "tip": "Watch out! Spam clicking will disqualify you."
        }
      }
    },
    "spell": {
      "title": "Spelling Bomb",
      "description": "Spell the word correctly before it explodes",
      "wordShown": "Memorize this word: {word}",
      "correctSpelling": "Perfect!",
      "wrongSpelling": "Oops, wrong spelling!",
      "explosion": "Boom! The bomb exploded",
      "instructions": {
        "slide1": {
          "title": "Spelling Bomb",
          "description": "Memorize and spell words before time runs out"
        },
        "slide2": {
          "title": "How Does It Work?",
          "description": "You have 5 seconds to memorize the word",
          "item1": "Memorize word in 5 seconds",
          "item2": "Type letter by letter",
          "item3": "No autocorrect, no delete"
        },
        "slide3": {
          "title": "Beware the Bomb",
          "description": "If you take too long, it explodes",
          "tip": "Type fast but accurately!"
        }
      }
    },
    "roulette": {
      "title": "Roulette",
      "description": "Answer questions from random categories",
      "categorySpun": "The roulette landed on {category}!",
      "questionTime": "Question from {category}",
      "instructions": {
        "slide1": {
          "title": "Question Roulette",
          "description": "The roulette decides the category each round"
        },
        "slide2": {
          "title": "Dynamics",
          "description": "Each round has a different category",
          "item1": "Random category per round",
          "item2": "Answer quickly to score points",
          "item3": "Slow players get eliminated"
        }
      }
    },
    "wordSearch": {
      "title": "Word Search",
      "description": "Find all hidden words",
      "wordFound": "Word found: {word}!",
      "allWordsFound": "You completed the puzzle!",
      "instructions": {
        "slide1": {
          "title": "Word Search",
          "description": "Find 12 hidden words in the grid"
        },
        "slide2": {
          "title": "How to Play?",
          "description": "Drag your mouse over letters to select",
          "item1": "12 hidden words",
          "item2": "Drag to select",
          "item3": "Fastest players score more points",
          "tip": "Words can be in any direction!"
        }
      }
    },
    "flappy": {
      "title": "Flappy Bird",
      "description": "Fly without hitting obstacles",
      "gameOver": "You crashed! Score: {score}",
      "newRecord": "New record: {score}!",
      "instructions": {
        "slide1": {
          "title": "Flappy Bird",
          "description": "Fly as far as possible without crashing"
        },
        "slide2": {
          "title": "Controls",
          "description": "Press SPACE to fly upwards",
          "item1": "SPACE to fly",
          "item2": "Avoid the pipes",
          "item3": "Survive as long as possible",
          "tip": "Timing is everything! Don't fly too high or too low."
        }
      }
    }
  },
  "achievements": {
    "unlocked": "Achievement Unlocked!",
    "newAchievement": "You got: {achievementName}",
    "firstBlood": "First Blood",
    "firstBloodDesc": "Play your first game",
    "survivor": "Survivor",
    "survivorDesc": "Survive 3 consecutive rounds",
    "champion": "Champion",
    "championDesc": "Win your first game",
    "speedster": "Speedster",
    "speedsterDesc": "Answer 5 questions in less than 10 seconds",
    "perfectionist": "Perfectionist",
    "perfectionistDesc": "Answer 10 questions correctly in a row"
  },
  "ui": {
    "loading": "Loading...",
    "connecting": "Connecting to server...",
    "connected": "Connected!",
    "disconnected": "Disconnected from server",
    "reconnecting": "Reconnecting...",
    "waiting": "Waiting for players...",
    "ready": "Ready!",
    "start": "Start",
    "cancel": "Cancel",
    "close": "Close",
    "confirm": "Confirm",
    "back": "Back",
    "next": "Next",
    "previous": "Previous",
    "finish": "Finish",
    "submit": "Submit",
    "skip": "Skip"
  },
  "errors": {
    "connectionLost": "Connection to server lost",
    "invalidAnswer": "Invalid answer",
    "timeExpired": "Time expired",
    "serverError": "Server error. Please try again.",
    "notFound": "Resource not found",
    "unauthorized": "You don't have permission to do this"
  },
  "audio": {
    "soundtrack": "Music",
    "effect": "Effect",
    "voice": "Voice",
    "ambience": "Ambience"
  },
  "instructions": {
    "subtitle": "Read the instructions before starting",
    "previous": "Previous",
    "next": "Next",
    "understood": "Got it",
    "skipFuture": "Don't show again"
  },
  "supervisor": {
    "dashboard": "Control Panel",
    "startGame": "Start Game",
    "pauseGame": "Pause Game",
    "endGame": "End Game",
    "kickPlayer": "Kick Player",
    "mutePlayer": "Mute Player",
    "forceInstructions": "Show Instructions",
    "uploadSoundtrack": "Upload Music",
    "viewAudits": "View Audits"
  }
}
```

---

## Composable personalizado: useTranslation

**Ubicación:** `src/modules/core/composables/useTranslation.ts`

```typescript
import { useI18n } from 'vue-i18n'

export function useTranslation() {
  const { t, locale, d, n } = useI18n()

  // Función helper para traducir con fallback
  function translate(key: string, fallback?: string, params?: Record<string, any>): string {
    const translated = t(key, params)

    // Si la traducción retorna la key (no encontrada), usar fallback
    if (translated === key && fallback) {
      return fallback
    }

    return translated
  }

  // Función para cambiar idioma y persistir
  function setLocale(newLocale: 'es-CO' | 'en-US') {
    locale.value = newLocale
    localStorage.setItem('locale', newLocale)
    document.documentElement.lang = newLocale
  }

  // Función para formatear nombres de jugadores con tono colombiano
  function narratorName(playerName: string): string {
    if (locale.value === 'es-CO') {
      // Agregar "el parcero" o "la parcera" de manera aleatoria
      return Math.random() > 0.5 ? `el parcero ${playerName}` : playerName
    }
    return playerName
  }

  return {
    t: translate,
    locale,
    d,
    n,
    setLocale,
    narratorName,
  }
}
```

---

## Directivas Personalizadas

### v-t (traducción directa en template)

```vue
<template>
  <!-- En lugar de {{ $t('key') }} -->
  <p v-t="'narrator.welcome'"></p>

  <!-- Con parámetros -->
  <p v-t="{ path: 'game.playerCount', args: { count: 10 } }"></p>
</template>
```

---

## Pluralización

### Ejemplo en JSON

```json
{
  "game": {
    "eliminatedPlayers": "0 jugadores eliminados | 1 jugador eliminado | {count} jugadores eliminados"
  }
}
```

### Uso en Vue

```vue
<template>
  <p>{{ $t('game.eliminatedPlayers', eliminatedCount) }}</p>
</template>
```

---

## Formato de Fechas

```vue
<script setup>
import { useI18n } from 'vue-i18n'

const { d } = useI18n()

const gameDate = new Date()
</script>

<template>
  <!-- Formato corto -->
  <p>{{ d(gameDate, 'short') }}</p>
  <!-- Formato largo -->
  <p>{{ d(gameDate, 'long') }}</p>
</template>
```

**Output (es-CO):**

- Short: `15 ene 2024`
- Long: `lunes, 15 de enero de 2024, 10:30`

---

## Formato de Números

```vue
<script setup>
import { useI18n } from 'vue-i18n'

const { n } = useI18n()

const score = 123456.78
</script>

<template>
  <!-- Formato decimal -->
  <p>{{ n(score, 'decimal') }}</p>
  <!-- Formato moneda -->
  <p>{{ n(score, 'currency') }}</p>
  <!-- Formato porcentaje -->
  <p>{{ n(0.75, 'percent') }}</p>
</template>
```

**Output (es-CO):**

- Decimal: `123.456,78`
- Currency: `$123.457`
- Percent: `75%`

---

## Lazy Loading de Locales (Futuro)

Para mejorar performance inicial, cargar locales dinámicamente:

```typescript
// i18n.ts (modificado)
const i18n = createI18n({
  legacy: false,
  locale: 'es-CO',
  fallbackLocale: 'es-CO',
  messages: {
    'es-CO': {}, // Cargar después
    'en-US': {}, // Cargar después
  },
})

// Función para cargar locale
export async function loadLocale(locale: string) {
  const messages = await import(`@/locales/${locale}.json`)
  i18n.global.setLocaleMessage(locale, messages.default)
  return messages.default
}
```

---

## Testing de Traducciones

### Vitest Unit Test

```typescript
import { describe, it, expect } from 'vitest'
import { createI18n } from 'vue-i18n'
import esMessages from '@/locales/es-CO.json'
import enMessages from '@/locales/en-US.json'

describe('i18n Translations', () => {
  const i18n = createI18n({
    legacy: false,
    locale: 'es-CO',
    fallbackLocale: 'es-CO',
    messages: {
      'es-CO': esMessages,
      'en-US': enMessages,
    },
  })

  it('should translate narrator welcome message in Spanish', () => {
    expect(i18n.global.t('narrator.welcome')).toContain('parcero')
  })

  it('should translate narrator welcome message in English', () => {
    i18n.global.locale.value = 'en-US'
    expect(i18n.global.t('narrator.welcome')).toContain('Welcome')
  })

  it('should interpolate player count', () => {
    const message = i18n.global.t('game.playerCount', { count: 5 })
    expect(message).toContain('5')
  })
})
```

---

## Integración con Status Bar

**Ubicación:** `src/ui/layouts/GameLayout.vue` (agregar LanguageSwitcher)

```vue
<template>
  <div class="min-h-screen bg-base-200">
    <!-- Status Bar -->
    <div class="navbar bg-base-100 shadow-lg">
      <div class="flex-1">
        <a class="btn btn-ghost normal-case text-xl">Ruleta Familiar</a>
      </div>

      <div class="flex-none gap-2">
        <!-- Music Box -->
        <MusicBox />

        <!-- Language Switcher -->
        <LanguageSwitcher />

        <!-- User Menu -->
        <div class="dropdown dropdown-end">
          <!-- ... -->
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <main>
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import MusicBox from '@/ui/components/hud/MusicBox.vue'
import LanguageSwitcher from '@/ui/components/hud/LanguageSwitcher.vue'
</script>
```

---

## Consideraciones de UX

1. **Persistencia:** Guardar preferencia en localStorage para que persista entre sesiones
2. **Auto-detección:** Detectar idioma del navegador en primer uso
3. **Cambio instantáneo:** No requiere recargar página
4. **Fallback inteligente:** Si falta traducción, mostrar en idioma predeterminado (es-CO)
5. **Accesibilidad:** Banderas + nombres de idioma para claridad
6. **Responsive:** Ocultar nombre del idioma en móvil (solo bandera)

---

## Mejoras Futuras

- **Más idiomas:** Portugués (Brasil), Francés, Alemán
- **Traducción automática:** Integración con DeepL API para contenido dinámico
- **Contribuciones:** Sistema para que usuarios sugieran mejoras de traducciones
- **A/B Testing:** Diferentes tonos de narrador (formal vs informal)
- **Voice-over:** TTS con ElevenLabs en idioma seleccionado
- **Regional dialects:** es-MX, es-AR, es-ES con modismos locales

---

## Dependencias

- **vue-i18n:** 9.x (compatible con Vue 3 Composition API)
- **localStorage:** Para persistir preferencia de idioma
- **Audit System:** Logging de cambios de idioma (analytics)

---

## Estructura de Archivos

```
src/locales/
├── es-CO.json                    ← Español Colombiano (200+ keys)
└── en-US.json                    ← English US (200+ keys)

src/plugins/
└── i18n.ts                       ← Configuración vue-i18n

src/modules/core/composables/
└── useTranslation.ts             ← Composable personalizado

src/ui/components/hud/
└── LanguageSwitcher.vue          ← Selector de idioma
```

---

## Claves de Traducción por Módulo

### Organizadas por namespace

- **narrator.\***: Diálogos del narrador (20+ keys)
- **games.\***: Nombres, descripciones, instrucciones de juegos (100+ keys)
- **achievements.\***: Nombres y descripciones de logros (40+ keys)
- **ui.\***: Elementos de interfaz generales (30+ keys)
- **errors.\***: Mensajes de error (10+ keys)
- **audio.\***: Terminología de audio (5+ keys)
- **instructions.\***: Textos del sistema de instrucciones (5+ keys)
- **supervisor.\***: Panel de control del supervisor (10+ keys)

**Total estimado:** 220+ claves de traducción por idioma
