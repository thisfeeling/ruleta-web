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
2. **Deletréalo** (individual, audio grabado, supervisión)
3. **La Cuerda** (grupos, visual 3D, eliminación grupal)
4. **Millonario** (segunda ronda)
5. **Deletréalo** (segunda ronda)
6. **La Ruleta** (FINAL - solo 1 ganador)

### Stack Técnico

#### Backend

- **Laravel 12** (PHP 8.3)
- **Reverb** (WebSocket nativo)
- **PostgreSQL/MySQL** (base de datos)
- **RustFS (S3)** (almacenamiento)
- **ElevenLabs** (TTS español colombiano)
- **Supervisor** (gestión procesos)

#### Frontend

- **Vue 3.5** + **TypeScript 5.9**
- **Vite 7** (build tool)
- **Pinia 3** (state management)
- **Laravel Echo** (WebSocket client)
- **Tailwind CSS 4** + **DaisyUI**
- **Three.js** (visual 3D para La Cuerda)

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

## 📂 Estructura Frontend (Vue 3)

```
src/
├── app/                    # Entry point, router
├── assets/                 # Estilos, imágenes, audio
├── modules/
│   ├── core/               # Infraestructura (services, stores base)
│   │   ├── services/
│   │   │   ├── echo.service.ts      👈 Cliente WebSocket
│   │   │   ├── audio.service.ts     👈 Reproducción audio
│   │   │   └── api.service.ts       👈 Cliente HTTP
│   │   ├── stores/                   # Auth, UI global
│   │   └── composables/              # Reutilizables
│   │
│   ├── game/               # Orquestador del show
│   │   ├── stores/                   # Estado global juego
│   │   ├── engine/
│   │   │   └── state-machine.ts     👈 Flujo juegos
│   │   └── scenes/                   # Lobby, Winner
│   │
│   ├── games/              # Cada juego es un módulo
│   │   ├── millionaire/
│   │   ├── rope/
│   │   │   └── rope.visual.ts       👈 Three.js aquí
│   │   ├── spell/
│   │   └── roulette/
│   │
│   ├── player/             # Sistema jugadores
│   ├── supervisor/         # Dashboard supervisión
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
- `PlayerEliminated` - Jugador eliminado
- `PlayerPassed` - Jugador avanza
- `GameStarted` - Nuevo juego inicia
- `ScreenChanged` - Pantalla transición
- `AudioRequested` - Reproducir audio

### Por Juego

- **Millonario**: `QuestionReceived`, `AnswerResult`
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
