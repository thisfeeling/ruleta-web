# Technical Goals

## Arquitectura General

### Objetivo Principal

Construir una plataforma de juegos en tiempo real escalable, mantenible y desplegable en infraestructura propia, con separación clara entre cliente y servidor.

## Metas Técnicas por Área

### 🏗️ Arquitectura

**Dos repositorios independientes**

- `game-server`: Laravel 12 + Reverb
- `game-client`: Vue 3 + Echo

**Beneficios esperados:**

- Deploy independiente
- Equipos separados (si crece)
- Reutilización del backend para mobile futuro
- Versionado independiente

**No usar:**

- ❌ Laravel + Inertia (amarra frontend al backend)
- ❌ Monorepo (complejidad innecesaria para este caso)
- ❌ Reverb como servicio separado (vive dentro de Laravel)

### 🔌 WebSockets en Tiempo Real

**Laravel Reverb como servidor WS**

- Sin servicios externos (Pusher, Ably)
- Mismo dominio que API
- SSL/WSS automático con Traefik
- Supervisor integrado para estabilidad

**Laravel Echo como cliente**

- Único cliente JS necesario
- Sin `pusher-js` (no aplica para Reverb)
- Reconexión automática
- Manejo de canales privados/presencia

**Patrones esperados:**

- Broadcast de eventos desde Laravel
- Vue escucha y actualiza stores
- 0 polling
- Latencia <100ms para eventos críticos

### 🎮 Servidor Autoritativo

**Laravel controla:**

- Estado del juego
- Reglas de eliminación
- Validación de acciones
- Timing de eventos
- Asignación de números/PINs
- Formación de grupos

**Vue solo:**

- Renderiza estado
- Envía inputs
- Reproduce audio
- Anima visuales

**Ventajas:**

- Anti-trampas
- Consistencia garantizada
- Escalabilidad
- Auditoría completa

### 📦 Almacenamiento y Caché

**RustFS (S3-compatible)**

- Audios del sistema (narrador)
- Audios de jugadores (Deletréalo)
- Assets estáticos

**PostgreSQL/MySQL**

- Estado persistente
- Jugadores
- Audios (metadatos)
- Historial de partidas

**Redis (opcional)**

- Caché de sesiones
- Cola de trabajos
- Pub/sub adicional si es necesario

### 🎙️ Audio Pipeline

**Generación (backend-only):**

1. Laravel dispara Job
2. Worker Node.js con ElevenLabs SDK
3. Audio generado → S3
4. Metadatos → BD
5. URL firmada → evento Reverb

**Reproducción (frontend):**

1. Vue recibe evento con URL
2. AudioService reproduce
3. Three.js sincroniza visual (si aplica)

**Caché obligatorio:**

- Números 1-50 generados una sola vez (seed)
- Diálogos del sistema reutilizables
- 0 llamadas repetidas a ElevenLabs en runtime

### 🎨 Visual 3D (Three.js + WebGPU)

**Uso específico:**

- Juego de La Cuerda (visual principal)
- Efectos en otros juegos (opcional)

**Límites claros:**

- Three.js NO decide ganadores
- Three.js NO calcula física real
- Three.js solo anima estado recibido de Laravel

**Fallback:**

- WebGPU si disponible
- WebGL automático si no
- 2D simple como último recurso

### 🐳 Containerización y Deploy

**Docker:**

- Contenedor Laravel (PHP-FPM + Reverb via Supervisor)
- Contenedor Vue (Nginx sirviendo build estático)
- Contenedor Redis
- Contenedor DB

**Dokploy + Traefik:**

- Routing automático HTTP/WS
- SSL automático (Let's Encrypt)
- Balanceo si escala
- Logs centralizados

**Entornos:**

- Local: `docker-compose up`
- Producción: Dokploy gestiona contenedores
- Mismo código, diferentes `.env`

### 🔐 Seguridad

**Autenticación:**

- Tokens JWT (no sesiones tradicionales)
- PIN de 4 dígitos para reconexión
- Roles: `player` | `supervisor`

**Autorización:**

- Middleware Laravel para rutas API
- Políticas para canales Reverb
- Supervisores: acceso a todos los eventos
- Jugadores: solo su sala/partida

**Rate Limiting:**

- Clicks en La Cuerda
- Mensajes de chat
- Reconexiones

### 📊 Monitoreo y Observabilidad

**Logs:**

- Laravel: todos los eventos críticos
- Reverb: conexiones/desconexiones
- Vue: errores de runtime

**Métricas deseadas:**

- Jugadores conectados
- Latencia promedio WebSocket
- Tasa de reconexiones exitosas
- Audios generados vs cacheados

### 🧪 Testing

**Backend:**

- Unit tests para lógica de eliminación
- Feature tests para API
- Tests de eventos Reverb

**Frontend:**

- Unit tests para stores y composables
- Tests de componentes con Vitest
- E2E con Playwright para flujos críticos

### 🚀 Performance

**Objetivos medibles:**

- WebSocket latency: <100ms
- Audio playback: <500ms desde evento
- Reconexión: <3s
- Build Vue: <10s
- 50 jugadores simultáneos sin degradación

**Optimizaciones planeadas:**

- Lazy loading de componentes de juegos
- Tree shaking agresivo
- Compresión Brotli en Nginx
- CDN para assets estáticos (si aplica)

## Restricciones Técnicas

### ❌ NO usar

- Inertia.js (limita mobile futuro)
- Pusher SDK (no aplica con Reverb)
- ElevenLabs en frontend (inseguro/costoso)
- State management sin Pinia (desorganizado)
- Lógica de juego en Vue (no autoritativo)

### ✅ USAR obligatorio

- TypeScript en todo el frontend
- Type hints en todo el backend
- ESLint + Prettier
- Conventional Commits
- Environment variables para secrets

## Roadmap Técnico

### Fase 1: Fundación (actual)

- ✅ Estructura de carpetas frontend
- ✅ Setup Docker básico
- ⏳ Migraciones y seeders
- ⏳ Sistema de audio base
- ⏳ Echo + Reverb conectados

### Fase 2: Core Features

- State machine del show
- Primer juego completo (Millonario)
- Sistema de reconexión
- Stat cards públicas

### Fase 3: Visual y Audio

- Three.js para La Cuerda
- Pipeline completo de ElevenLabs
- Chat en tiempo real

### Fase 4: Pulido

- Supervisión completa
- Dashboard supervisor
- Optimizaciones de performance
- Deploy producción Dokploy

### Fase 5: Mobile (futuro)

- Capacitor wrapper
- Adaptación UI móvil
- PWA completo
