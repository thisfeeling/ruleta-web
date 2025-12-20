# AI Context - Ruleta Familiar (Frontend)

> **Proyecto**: Plataforma de Game Show en Tiempo Real  
> **Stack**: Vue 3 + Laravel 12 + Reverb + Docker + Dokploy  
> **Inspiración**: SquidCraft (formato eliminatorio familiar)  
> **Fecha**: Diciembre 2025

## 📋 Índice Rápido

### [📚 LLM.txt's](llms/) - llms.txt de las tecnologias
- **[DaisyUI 5](llms/daisy-llms.txt)** - Framework css utilitario basado en Tailwind CSS
- **[Vue 3 intro](llms/vue-llms.txt)** - Framework frontend JavaScript
- **[Vue 3 full](llms/vue-llms-full.txt)** - Framework frontend JavaScript
- **[Tailwind 4 CSS](llms/tailwind-llms.txt)** - Framework CSS utilitario

### [🎯 Goals](goals/) - Objetivos del Proyecto

- **[Project Overview](goals/project-overview.md)** - Concepto, audiencia, filosofía
- **[Technical Goals](goals/technical-goals.md)** - Metas arquitectónicas y técnicas
- **[Game Goals](goals/game-goals.md)** - Flujo de juego, eliminación, experiencia

### [📚 Knowledge](knowledge/) - Arquitectura y Stack Técnico

- **[Architecture](knowledge/architecture.md)** - Dos repos, servidor autoritativo, flujo de datos
- **[Tech Stack](knowledge/tech-stack.md)** - Laravel 12, Vue 3, Reverb, Docker, herramientas
- **[Frontend Structure](knowledge/frontend-structure.md)** - Organización carpetas, módulos, patrones
- **[Backend Structure](knowledge/backend-structure.md)** - DDD, Actions, Services, Events
- **[WebSockets](knowledge/websockets.md)** - Reverb + Echo, canales, eventos
- **[Audio System](knowledge/audio-system.md)** - ElevenLabs, S3, reproducción, seeders

### [📖 Rules](rules/) - Reglas de Implementación

- **Game Flow** - State machine del show completo
- **Elimination Math** - Lógica de eliminaciones dinámicas
- **Game Rules** - Millonario, Cuerda, Deletréalo, Ruleta
- **Supervisor Role** - Permisos, validación, moderación
- **Coding Standards** - Convenciones TypeScript/Vue/Laravel

---

## 🎮 Resumen del Proyecto

### Concepto Core

Plataforma web de juegos tipo "game show" donde hasta **50 jugadores** compiten en **4 juegos eliminatorios** hasta coronar un único ganador. Diseñado para familias, con sistema de supervisión y reconexión automática.

### Juegos (Orden)

1. **Juego del Millonario** (preguntas, eliminación masiva)
2. **Deletréalo** (individual, audio grabado, supervisión, bomba 3D)
3. **La Cuerda** (grupos, visual 3D tensión, eliminación grupal)
4. **Millonario** (segunda ronda)
5. **Deletréalo** (segunda ronda)
6. **La Ruleta** (FINAL - solo 1 ganador)

### Juegos Bonus (Opcionales)

7. **¡A buscar!** (sopa de letras, HTML/CSS, no eliminatorio)
8. **No Lo Choques** (Flappy Bird, Phaser 3, no eliminatorio)

> **Nota**: Los bonus games son activados manualmente por el Supervisor entre juegos principales. Todos participan, generan puntos en scoreboard, pero NO eliminan jugadores.

### Stack Técnico

#### Backend

- **Laravel 12** (PHP 8.3)
- **Reverb** (WebSocket nativo)
- **MySQL** (base de datos)
- **RustFS (S3)** (almacenamiento)
- **ElevenLabs** (TTS español colombiano)
- **Supervisor** (gestión procesos)

#### Frontend

- **Vue 3.5** + **TypeScript 5.9**
- **Vite 7** (build tool)
- **Pinia 3** (state management)
- **Laravel Echo** (WebSocket client)
- **Tailwind CSS 4** + **DaisyUI 5**
- **Three.js 0.182** + **tresjs-vue** (visual 3D para Cuerda y Bomba)
- **Phaser 3.80** (juego Flappy Bird bonus)

#### Deployment

- **Docker** + **Docker Compose**
- **Dokploy** (plataforma deployment)
- **Traefik** (reverse proxy + SSL)

---

## 🏗️ Arquitectura Fundamental

### Dos Repositorios

```
game-server/    → Laravel 12 + Reverb
game-client/    → Vue 3 + Echo
```

**Razón**: Deploy independiente, reutilización backend para mobile futuro, separación clara.

### Servidor Autoritativo

```
Laravel decide TODO
  ├─ Posiciones
  ├─ Eliminaciones
  ├─ Reglas
  └─ Estado

Vue renderiza estado
  ├─ UI/HUD
  ├─ Audio playback
  └─ Visual 3D (solo cosmético)
```

**Razón**: Anti-trampas, consistencia garantizada, escalabilidad.

### Comunicación WebSocket

```
Laravel Reverb (servidor WS)
        ↕ WSS://
Laravel Echo (cliente JS)
```

**Importante**:

- Reverb vive DENTRO de Laravel (no contenedor separado)
- Solo necesitas `laravel-echo` (NO `pusher-js`)
- Mismo dominio y puerto 443 (HTTPS/WSS)

---

## Sistemas Clave

### Sistema de Puntuación Unificado (Scoreboard)

El sistema de puntuación agrega puntos de todos los juegos (main + bonus) en un ranking global:

- **Base de datos**: Tabla `player_scores` con normalización 0-1000
- **Normalizaciones por juego**:
  - Millonario: % respuestas correctas × 1000
  - Deletréalo: 600 (sobrevivir) + 200 (deletrear correctamente)
  - La Cuerda: 600 (ganar grupo) + bono por contribución
  - La Ruleta: 2000 (ganador) o consolación por posición
  - ¡A buscar!: (1 - tiempo/maxTiempo) × 500
  - No Lo Choques: tiempoSobrevivido / 100
- **Tiempo real**: WebSocket con eventos `ScoreAdded`, `ScoreboardUpdated`
- **UI**: Componente completo `Scoreboard.vue` + compacto `ScoreboardCompact.vue` (HUD)

**Documentación**: [knowledge/scoreboard-system.md](knowledge/scoreboard-system.md)

### Arquitectura de Audio Producción

Sistema de audio con 3 canales independientes, preload, y cola de reproducción:

- **Canales**: Music (0.6), SFX (0.8), Voice (1.0) con control de volumen independiente
- **Preload**: Assets críticos (click, tick, explode) al inicio
- **Cola de voz**: Reproducción secuencial para evitar superposición de narración
- **Integración**: Backend URLs firmadas via Reverb, sync con Three.js via AudioContext
- **Assets organizados**:
  - `assets/audio/music/` - temas de fondo
  - `assets/audio/voices/countdown/` - cuenta regresiva TTS
  - `assets/audio/sfx/ui/` - clicks, transiciones
  - `assets/audio/sfx/rope/` - tensión, snap
  - `assets/audio/sfx/roulette/` - spin, stop
  - `assets/audio/sfx/bomb/` - ticking, explosion
  - `assets/audio/sfx/results/` - victory, defeat

**Documentación**: [knowledge/audio-system.md](knowledge/audio-system.md)

### Visualizaciones Three.js

Rendering 3D visual-only (no lógica de juego) para dos juegos:

- **RopeVisual** (La Cuerda): 
  - Renderer WebGPU con fallback WebGL
  - Cuerda 3D que se mueve horizontalmente según tensión (-1 a 1)
  - Marcador central rojo pulsante
  - Interpolación suave con lerp
  - ~250 líneas de código
  
- **BombVisual** (Deletréalo):
  - Esfera que se infla de 1× a 3.5× según tiempo restante
  - Sistema de partículas (500) para explosión
  - Intensidad emissive aumenta con peligro
  - Animación de pulso y rotación
  - ~200 líneas de código

**Lifecycle crítico**: `onMounted()` → create, `onUnmounted()` → destroy() para evitar memory leaks

**Documentación**: [knowledge/threejs-visuals.md](knowledge/threejs-visuals.md)

---

## 📂 Estructura Frontend (Vue 3)

```
src/
├── app/                    # Entry point, router
├── assets/                 # Estilos, imágenes, audio
│   └── audio/              # Sistema de audio organizado
│       ├── music/          # Temas de fondo por escena
│       ├── voices/         # Narraciones TTS (countdown, etc)
│       └── sfx/            # Efectos de sonido
│           ├── ui/         # Clicks, transiciones
│           ├── rope/       # Tensión, snap
│           ├── bomb/       # Ticking, explosion
│           ├── roulette/   # Spin, stop
│           └── results/    # Victory, defeat
├── modules/
│   ├── core/               # Infraestructura (services, stores base)
│   │   ├── services/
│   │   │   ├── echo.service.ts      👈 Cliente WebSocket
│   │   │   ├── audio.service.ts     👈 Sistema audio producción (3 canales)
│   │   │   └── api.service.ts       👈 Cliente HTTP
│   │   ├── stores/                   # Auth, UI global
│   │   └── composables/              # Reutilizables
│   │       └── useAudio.ts          👈 Wrapper audio con lifecycle
│   │
│   ├── game/               # Orquestador del show
│   │   ├── stores/                   # Estado global juego
│   │   ├── engine/
│   │   │   └── state-machine.ts     👈 Flujo juegos (con estados bonus)
│   │   ├── scenes/                   # Lobby, Winner, Transition
│   │   └── scoreboard/              👈 Sistema puntuación unificado
│   │       ├── scoreboard.store.ts   # Pinia store rankings
│   │       ├── scoreboard.types.ts   # Tipos TypeScript
│   │       ├── scoreboard.logic.ts   # Normalización puntos
│   │       ├── scoreboard.socket.ts  # WebSocket listeners
│   │       └── Scoreboard.vue        # UI completa + compacta
│   │
│   ├── games/              # Cada juego es un módulo
│   │   ├── millionaire/
│   │   ├── rope/
│   │   │   └── rope.visual.ts       👈 Three.js visual tensión 3D
│   │   ├── spell/
│   │   │   └── spell.visual.ts      👈 Three.js bomba inflando + explosión
│   │   ├── roulette/
│   │   ├── word-search/             👈 NUEVO: Bonus sopa de letras
│   │   │   ├── WordSearchScene.vue   # Escena principal
│   │   │   ├── WordSearchGrid.vue    # Grid HTML/CSS
│   │   │   ├── word-search.store.ts  # Pinia store
│   │   │   ├── word-search.logic.ts  # Generación/validación
│   │   │   └── word-search.socket.ts # WebSocket listeners
│   │   └── flappy/                  👈 NUEVO: Bonus Flappy Bird
│   │       ├── FlappyScene.vue       # Escena principal
│   │       ├── flappy.game.ts        # Setup Phaser
│   │       ├── flappy.scenes.ts      # MainScene Phaser
│   │       ├── flappy.store.ts       # Pinia store
│   │       └── flappy.socket.ts      # WebSocket listeners
│   │
│   ├── player/             # Sistema jugadores
│   ├── supervisor/         # Dashboard supervisión (con controles bonus)
│   └── chat/               # Chat tiempo real
│
├── ui/                     # Componentes reutilizables
│   ├── components/
│   └── layouts/
│
└── views/                  # Páginas (routing)
```

### Convenciones

- **PascalCase**: Componentes `.vue`
- **camelCase**: Archivos `.ts`
- **Imports absolutos**: `@/modules/...`
- **Stores Pinia**: Gestión estado
- **Composables**: Lógica reutilizable

---

## 🔌 WebSockets: Eventos Clave

### Canal Global (`game.show`)

- `PlayerJoined` - Jugador entra
- `PlayerEliminated` - Jugador eliminado (incluye audio_url de narración TTS)
- `PlayerPassed` - Jugador avanza
- `GameStarted` - Nuevo juego inicia
- `ScreenChanged` - Pantalla transición
- `AudioRequested` - Reproducir audio (música, SFX, voz)
- `ScoreAdded` - Puntos agregados al scoreboard
- `ScoreboardUpdated` - Ranking actualizado

### Por Juego

- **Millonario**: `QuestionReceived`, `AnswerResult`
- **Deletréalo**: `WordStarted`, `LetterResult`, `BombExploded`
- **La Cuerda**: `RoundStarted`, `TensionUpdated`, `RopeSnapped`
- **La Ruleta**: `SpinStarted`, `SpinResult`
- **¡A buscar!**: `GridGenerated`, `WordFound`, `GameCompleted`
- **No Lo Choques**: `GameStarted`, `GameEnded`, `ScoreSubmitted`
- **Rope**: `RopeStateUpdated`, `GroupEliminated`
- **Spell**: `PlayerSelected`, `AudioValidated`
- **Roulette**: `ScoreUpdated`, `WinnerDeclared`

### Supervisor

- `SpellAudioPending` - Audio necesita validación
- `StateSnapshot` - Estado completo del juego

---

## 🎙️ Sistema de Audio

### Generación (Backend ONLY)

```
ElevenLabs API (es-CO)
    ↓
Laravel Job
    ↓
RustFS S3 Storage
    ↓
Database (metadatos)
    ↓
Reverb broadcast (URL firmada)
```

### Tipos de Audio

1. **Sistema** (narrador): "Jugador eliminado", "Bienvenidos", etc.
2. **Números** (1-50): "Jugador número X"
3. **Jugadores** (Deletréalo): Grabaciones revisadas por supervisores

### Caché Obligatorio

- ✅ Números 1-50 generados UNA VEZ (seeder)
- ✅ Diálogos sistema reutilizables
- ❌ NO regenerar en runtime

### Costo

- **Seeders**: ~70 audios × 1 vez = mínimo
- **Runtime**: 0 (todo cacheado)

---

## 👤 Sistema de Jugadores

### Al Entrar

- Jugador elige: **nickname** + **color**
- Sistema asigna:
  - **Número** (1-50, único, aleatorio)
  - **PIN** (4 dígitos, para reconexión)

### Stat Card (Pública)

```typescript
interface Player {
  id: number
  nickname: string
  gender: string | null
  color: string
  number: number // Asignado por sistema
  code: string // PIN (4 dígitos) - NO público
  status: 'alive' | 'eliminated'
  role: 'player' | 'supervisor'
  created_at: Date
  eliminated_at: Date | null
}
```

### Reconexión

1. Jugador pierde conexión (WiFi)
2. Pantalla reconexión muestra jugadores en sala
3. Jugador selecciona su **number** + **nickname**
4. Ingresa **PIN de 4 dígitos**
5. Laravel valida y reconecta
6. Vuelve al juego si sigue vivo, o modo espectador si eliminado

---

## 🎨 Visual 3D (Three.js)

### Uso ESPECÍFICO

- **Juego de La Cuerda**: Visual principal
- Opcional en otros juegos (efectos)

### Reglas Críticas

- ✅ Three.js es SOLO VISUAL
- ❌ Three.js NO decide ganadores
- ❌ Three.js NO calcula física real
- ✅ Laravel decide TODO, Three.js anima

### Ubicación

```
modules/games/rope/rope.visual.ts
```

### Patrón

```typescript
export class RopeVisual {
  scene: THREE.Scene
  renderer: WebGPURenderer
  rope: THREE.Mesh

  updateTension(value: number) {
    // value viene de Laravel via Reverb
    this.rope.position.x = value * 2
  }
}
```

**Sincronización con audio**: Opcional, usando `THREE.AudioAnalyser`

---

## 🚀 Deployment (Docker + Dokploy)

### Contenedores

```
Traefik (reverse proxy + SSL)
    ↓
Laravel (PHP-FPM + Reverb via Supervisor)
Vue 3 (Nginx + build estático)
Redis (opcional, caché)
PostgreSQL/MySQL (base de datos)
```

### Reverb en Docker

```ini
# supervisord.conf
[program:reverb]
command=php artisan reverb:start
autostart=true
autorestart=true
```

**NO es contenedor separado**, vive dentro de Laravel.

### Traefik

- Routing HTTP + WebSocket automático
- SSL/TLS (Let's Encrypt)
- Mismo dominio: `api.tudominio.com`

---

## ⚡ Quick Start Development

### Backend

```bash
cd game-server
composer install
php artisan migrate
php artisan db:seed  # Genera audios (una sola vez)
php artisan serve
php artisan reverb:start
```

### Frontend

```bash
cd game-client
npm install
npm run dev
```

### .env Frontend

```env
VITE_API_URL=http://localhost:8000
VITE_REVERB_APP_KEY=localkey
VITE_REVERB_HOST=localhost
VITE_REVERB_PORT=8080
VITE_REVERB_SCHEME=http
```

---

## 🔑 Decisiones Clave

| Decisión              | Razón                                   |
| --------------------- | --------------------------------------- |
| Dos repositorios      | Deploy independiente, mobile futuro     |
| Servidor autoritativo | Anti-trampas, consistencia              |
| Reverb (no Pusher)    | Gratis, control total, menor latencia   |
| Vue 3 (no React)      | Curva aprendizaje, reactividad superior |
| TypeScript            | Type safety, mejor DX                   |
| Pinia (no Vuex)       | Recomendación oficial Vue 3             |
| NO Inertia            | Limita mobile futuro                    |
| ElevenLabs backend    | Seguridad, caching                      |
| Three.js solo visual  | No mezclar render con lógica            |
| Dokploy               | Auto-deploy, gestión fácil              |

---

## 📊 Métricas de Éxito

- ✅ 50 jugadores simultáneos sin lag
- ✅ Latencia WebSocket <100ms
- ✅ Audio playback <500ms desde evento
- ✅ Reconexión exitosa <3s
- ✅ 0 inconsistencias cliente-servidor
- ✅ Tiempo juego completo: 30-45min

---

## 🎯 Próximos Pasos

### Fase Actual: Fundación

- [x] Estructura frontend/backend definida
- [x] Documentación AI context
- [ ] Migraciones y seeders
- [ ] Echo + Reverb conectados
- [ ] Sistema audio base

### Siguientes Fases

1. **Core Features**: State machine, primer juego
2. **Visual/Audio**: Three.js La Cuerda, pipeline ElevenLabs
3. **Pulido**: Supervisor completo, optimizaciones
4. **Mobile**: Capacitor wrapper (futuro)

---

## 📖 Referencias Rápidas

### Comandos Útiles

```bash
# Laravel
php artisan reverb:start
php artisan migrate:fresh --seed
php artisan tinker

# Vue
npm run dev
npm run build
npm run test:unit

# Docker
docker-compose up -d
docker-compose logs -f laravel
```

### Archivos Críticos

- Backend: `app/Domain/Show/ShowMachine.php`
- Frontend: `src/modules/core/services/echo.service.ts`
- WebSocket: `routes/channels.php`
- Audio: `database/seeders/NumberAudioSeeder.php`

---

## 🤝 Contribución

Este proyecto es familiar, pero sigue estándares profesionales:

- Conventional Commits
- TypeScript estricto
- ESLint + Prettier
- Tests unitarios + E2E

---

**Última actualización**: Diciembre 19, 2025  
**Versión**: 1.0.0-alpha  
**Mantenedor**: Familia (uso privado)
