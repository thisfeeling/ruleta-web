# Tech Stack

## Backend: Laravel 12

### Framework Core

- **Laravel 12**: Framework PHP moderno
- **PHP 8.3**: Runtime
- **Composer 2**: Gestión de dependencias

### WebSockets

- **Laravel Reverb**: Servidor WebSocket nativo de Laravel
  - No requiere Pusher ni servicios externos
  - Se ejecuta dentro del contenedor Laravel
  - Protocolo: `wss://` (WebSocket Secure)
  - Puerto: 443 (mismo que HTTPS)

### Base de Datos

- **PostgreSQL** o **MySQL 8**: Base de datos principal
  - Jugadores
  - Audios (metadatos)
  - Historial de partidas
  - State machine

### Caché y Colas (Opcional)

- **Redis**:
  - Caché de sesiones
  - Colas de trabajos
  - Pub/sub adicional si necesario

### Almacenamiento

- **RustFS (S3-compatible)**: Storage para archivos
  - Audios del sistema
  - Audios de jugadores
  - Assets estáticos
  - Compatible con S3 API

### Text-to-Speech

- **ElevenLabs API**:
  - Generación de voz narrador
  - Español colombiano
  - Voces naturales
  - SDK Node.js (`@elevenlabs/elevenlabs-js`)

### Process Management

- **Supervisor**: Gestión de procesos
  - PHP-FPM
  - Reverb (WebSocket server)
  - Queue workers (si aplica)

## Frontend: Vue 3

### Framework Core

- **Vue 3.5.25**: Framework progresivo JavaScript
  - Composition API
  - Reactivity System (Proxies)
  - Virtual DOM
- **TypeScript 5.9**: Tipado estático
- **Vite 7.2.4**: Build tool y dev server
  - Hot Module Replacement
  - Build optimization

### State Management

- **Pinia 3.0.4**: Store oficial Vue 3
  - Reemplazo de Vuex
  - TypeScript-first
  - Devtools integration

### Routing

- **Vue Router 4.6.3**: Router oficial
  - Navegación SPA
  - Guards
  - Lazy loading

### HTTP Client

- **Axios 1.13.2**: Cliente HTTP
  - Interceptors
  - Request/response transformation
  - Configuración centralizada

### WebSockets Client

- **Laravel Echo 2.2.6**: Cliente WebSocket
  - Compatible con Laravel Reverb
  - Canales públicos/privados/presence
  - Reconexión automática
  - **NO requiere `pusher-js`** (Reverb no es Pusher)

### Styling

- **Tailwind CSS 4.1.18**: Utility-first CSS
  - `@tailwindcss/vite` para integración
  - JIT compiler
  - Purge automático
- **DaisyUI 5.5.14**: Componentes Tailwind
  - Temas
  - Componentes pre-built
  - Accesibilidad

### 3D Graphics

- **Three.js** (latest): Motor 3D
  - WebGL renderer
  - WebGPU renderer (experimental)
  - Scene management
  - Usado en: Juego de La Cuerda

### UI Components

- **Lucide Vue Next 0.562.0**: Iconos
  - Vue 3 components
  - Tree-shakeable
  - Consistente con diseño

### Fonts

- **@fontsource-variable/orbitron 5.2.8**: Font personalizada
  - Variable font
  - Self-hosted
  - Performance optimizado

## Testing

### Unit Testing

- **Vitest 4.0.14**: Test runner
  - Compatible con Vite
  - Vue component testing
  - Fast execution

### Component Testing

- **@vue/test-utils 2.4.6**: Testing utilities
  - Component mounting
  - Event simulation
  - Props/slots testing

### E2E Testing

- **Playwright 1.57.0**: Browser automation
  - Multi-browser
  - Screenshots/videos
  - Network mocking

## Code Quality

### Linting

- **ESLint 9.39.1**: Linter JavaScript/TypeScript
  - Vue plugin
  - TypeScript parser
  - Custom rules

### Formatting

- **Prettier 3.6.2**: Code formatter
  - Consistent style
  - Auto-fix
  - Editor integration

## Containerization

### Docker

- **Docker**: Containerización
- **Docker Compose**: Orquestación local
- **Multi-stage builds**: Optimización imágenes

### Base Images

- **Laravel**: `php:8.3-fpm`
- **Vue**: `node:20-alpine` + `nginx:alpine`
- **Redis**: `redis:alpine`
- **Database**: `postgres:16` o `mysql:8`

### Process Manager

- **Supervisor**: Gestión de procesos dentro del contenedor
  ```ini
  [program:php-fpm]
  [program:reverb]
  ```

## Deployment

### Platform

- **Dokploy**: Plataforma deployment
  - Auto-deploy desde Git
  - Gestión contenedores
  - SSL automático
  - Logs centralizados

### Reverse Proxy

- **Traefik**: Reverse proxy
  - Routing HTTP/HTTPS
  - Routing WebSocket
  - SSL/TLS (Let's Encrypt)
  - Load balancing (si escala)

## Development Tools

### Node & Package Manager

- **Node.js**: `^20.19.0 || >=22.12.0`
- **npm** o **pnpm**: Gestión de paquetes

### TypeScript

- **vue-tsc 3.1.5**: TypeScript compiler para Vue
  - Type checking
  - .vue file support

### Build

- **Vite plugins**:
  - `@vitejs/plugin-vue`: Vue 3 support
  - `@tailwindcss/vite`: Tailwind integration

## Runtime Environments

### Development

```bash
# Frontend
npm run dev              # Vite dev server (5173)

# Backend
php artisan serve        # HTTP server (8000)
php artisan reverb:start # WebSocket server (8080)
```

### Production

```bash
# Frontend
npm run build            # Build estático → dist/
nginx                    # Servir build

# Backend
php-fpm                  # PHP runtime
php artisan reverb:start # WebSocket (Supervisor)
```

## Environment Variables

### Backend (.env)

```env
APP_URL=https://api.tudominio.com
BROADCAST_DRIVER=reverb

REVERB_APP_ID=local
REVERB_APP_KEY=localkey
REVERB_APP_SECRET=localsecret
REVERB_HOST=api.tudominio.com
REVERB_PORT=443
REVERB_SCHEME=https

RUSTFS_KEY=...
RUSTFS_SECRET=...
RUSTFS_BUCKET=...

ELEVENLABS_API_KEY=...
```

### Frontend (.env.production)

```env
VITE_API_URL=https://api.tudominio.com
VITE_REVERB_APP_KEY=localkey
VITE_REVERB_HOST=api.tudominio.com
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=https
```

## Protocols

- **HTTP/2**: API REST
- **WebSocket (WSS)**: Tiempo real
- **S3 API**: Almacenamiento archivos

## Security

- **HTTPS**: Obligatorio en producción
- **WSS**: WebSocket seguro
- **CORS**: Configurado en Laravel
- **JWT** o **Sanctum**: Autenticación API
- **Rate Limiting**: Prevención abuse

## Performance Targets

- WebSocket latency: <100ms
- API response: <200ms
- Audio playback start: <500ms
- Build time: <10s
- Lighthouse score: >90

## Version Control

- **Git**: Control de versiones
- **GitHub/GitLab**: Repositorio remoto
- **Conventional Commits**: Estándar de commits

## Monitoring (Futuro)

- Laravel Telescope (dev)
- Laravel Pulse (prod)
- Sentry (error tracking)
- Logs centralizados (Docker)

## Resumen Visual

```
┌─────────────────────────────────────────┐
│  FRONTEND (Vue 3)                       │
│  ├─ Vite                                │
│  ├─ TypeScript                          │
│  ├─ Pinia (state)                       │
│  ├─ Vue Router                          │
│  ├─ Laravel Echo (WS client)            │
│  ├─ Axios (HTTP)                        │
│  ├─ Three.js (3D)                       │
│  └─ Tailwind CSS + DaisyUI             │
└─────────────────────────────────────────┘
                 ↕ WSS + HTTPS
┌─────────────────────────────────────────┐
│  BACKEND (Laravel 12)                   │
│  ├─ PHP 8.3                             │
│  ├─ Reverb (WS server)                  │
│  ├─ PostgreSQL/MySQL                    │
│  ├─ Redis (opcional)                    │
│  └─ RustFS (S3)                         │
└─────────────────────────────────────────┘
                 ↕
┌─────────────────────────────────────────┐
│  EXTERNAL SERVICES                      │
│  ├─ ElevenLabs API (TTS)                │
│  └─ RustFS S3 Storage                   │
└─────────────────────────────────────────┘
```

## Decisiones Técnicas Clave

### ✅ Por qué Vue 3 (no React)

- Curva aprendizaje menor
- Composables naturales
- Reactividad superior para juegos
- Mejor para este equipo

### ✅ Por qué Reverb (no Pusher)

- Gratis (self-hosted)
- Control total
- Menor latencia (mismo servidor)
- Privacidad

### ✅ Por qué TypeScript

- Type safety
- Mejor DX
- Refactoring seguro
- Documentación implícita

### ✅ Por qué Pinia (no Vuex)

- Recomendación oficial Vue 3
- TypeScript-first
- API más simple
- Mejor DevTools

### ✅ Por qué Tailwind

- Utility-first rápido
- DaisyUI acelera UI
- Purge automático
- Consistencia fácil

### ❌ Por qué NO Inertia

- Limita mobile futuro
- Acopla frontend/backend
- No queremos SSR

### ❌ Por qué NO Pusher JS SDK

- Reverb NO es Pusher
- Solo necesitamos Echo
- Reduce bundle size
