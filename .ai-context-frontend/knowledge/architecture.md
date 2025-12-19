# Architecture

## Decisión Arquitectónica: Dos Repositorios

### Repositorios

```
game-server/          (Laravel 12 + Reverb)
game-client/          (Vue 3 + Echo)
```

### Razones de la Separación

**✅ Ventajas:**

- Deploy independiente
- Escalado independiente
- Equipos separados si el proyecto crece
- Reutilización del backend para mobile (Capacitor)
- Versionado independiente
- Testing aislado

**❌ Por qué NO un monorepo:**

- No hay código compartido significativo
- Vue no necesita código del backend (solo API)
- Mayor complejidad sin beneficio real en este caso

**❌ Por qué NO Laravel + Inertia:**

- Amarra el frontend al backend
- Imposible reutilizar para mobile
- Frontend depende de rutas de Laravel
- No hay API pública real

## Modelo de Autoridad: Servidor Autoritativo

### Principio Fundamental

```
Laravel = AUTORIDAD (decide TODO)
Vue = RENDERIZADOR (muestra estado)
```

### Flujo de Datos

```
┌──────────────┐
│  Jugador     │
│  (input)     │
└──────┬───────┘
       │ click / tecla
       ↓
┌──────────────┐
│  Vue 3       │
│  (cliente)   │
└──────┬───────┘
       │ WebSocket (Echo)
       │ { action: "move", dir: "left" }
       ↓
┌──────────────┐
│  Laravel 12  │
│  (servidor)  │
├──────────────┤
│ • Valida     │
│ • Calcula    │
│ • Decide     │
└──────┬───────┘
       │ Reverb (broadcast)
       │ { player_id: 5, x: 120, y: 300 }
       ↓
┌──────────────┐
│  Todos los   │
│  Clientes    │
└──────┬───────┘
       │
       ↓
┌──────────────┐
│  Store Pinia │
│  actualizado │
└──────┬───────┘
       │
       ↓
┌──────────────┐
│  Vue         │
│  re-renderiza│
└──────────────┘
```

### ¿Qué Decide Laravel?

- Posiciones de jugadores
- Puntuación
- Eliminaciones
- Formación de grupos
- Inicio/fin de juegos
- Asignación de números/PINs
- Validación de respuestas
- Timing de eventos

### ¿Qué Hace Vue?

- Renderizar estado
- Capturar input del usuario
- Enviar acciones al servidor
- Reproducir audio
- Animar visuales (Three.js)
- Mostrar UI/HUD
- Gestionar rutas locales

### ¿Por Qué Servidor Autoritativo?

**✅ Anti-trampas:**

- Cliente no puede modificar estado crítico
- Imposible "hackear" puntuación o posición

**✅ Consistencia:**

- Todos los clientes ven lo mismo
- Una única fuente de verdad

**✅ Auditoría:**

- Todo evento crítico registrado en servidor
- Logs completos de la partida

**✅ Escalabilidad:**

- Lógica centralizada
- Fácil de mantener y depurar

## Comunicación: WebSockets (Laravel Reverb)

### Arquitectura de Comunicación

```
┌─────────────────────────────────────┐
│         Laravel 12                   │
│  ┌──────────────────────────────┐  │
│  │   HTTP API (REST)            │  │  ← Autenticación, registro
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │   Reverb (WebSocket Server)  │  │  ← Tiempo real
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
               ↕
        WSS:// + HTTPS://
               ↕
┌─────────────────────────────────────┐
│         Vue 3                        │
│  ┌──────────────────────────────┐  │
│  │   Axios (HTTP)               │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │   Laravel Echo (WS Client)   │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

### ¿Reverb es un Contenedor Separado?

**❌ NO**

Reverb vive **dentro del contenedor de Laravel**, no como servicio independiente.

```dockerfile
# Dockerfile Laravel
CMD php artisan reverb:start & php-fpm
```

O mejor, con Supervisor:

```ini
[program:reverb]
command=php artisan reverb:start
```

### Mismo Dominio, Mismo Puerto

```
https://api.tudominio.com     ← Laravel HTTP
wss://api.tudominio.com       ← Reverb WebSocket
```

Traefik detecta automáticamente la conexión WebSocket y la enruta correctamente.

## Capas de la Aplicación

### Backend (Laravel)

```
┌─────────────────────────────────────┐
│         Presentation Layer           │
│  • Controllers                       │
│  • Broadcasts (Reverb channels)     │
│  • API Resources                     │
└─────────────────────────────────────┘
               ↓
┌─────────────────────────────────────┐
│         Application Layer            │
│  • Actions (casos de uso)           │
│  • Jobs (tareas asíncronas)         │
│  • Events (eventos de dominio)      │
└─────────────────────────────────────┘
               ↓
┌─────────────────────────────────────┐
│         Domain Layer                 │
│  • Domain Models                     │
│  • Services                          │
│  • Repositories                      │
│  • State Machines                    │
└─────────────────────────────────────┘
               ↓
┌─────────────────────────────────────┐
│         Infrastructure Layer         │
│  • Database (Eloquent)               │
│  • S3 (RustFS)                       │
│  • ElevenLabs API                    │
│  • Redis (opcional)                  │
└─────────────────────────────────────┘
```

### Frontend (Vue 3)

```
┌─────────────────────────────────────┐
│         Presentation Layer           │
│  • Components (.vue)                 │
│  • Views (pages)                     │
│  • Layouts                           │
└─────────────────────────────────────┘
               ↓
┌─────────────────────────────────────┐
│         Application Layer            │
│  • Stores (Pinia)                    │
│  • Composables                       │
│  • Router                            │
└─────────────────────────────────────┘
               ↓
┌─────────────────────────────────────┐
│         Infrastructure Layer         │
│  • Services (API, Echo, Audio)       │
│  • Three.js Engine                   │
│  • LocalStorage                      │
└─────────────────────────────────────┘
```

## Flujo de un Evento Completo

### Ejemplo: Jugador Eliminado en "Deletréalo"

```
1. Jugador envía audio
   Vue → POST /api/spell/submit

2. Laravel guarda audio
   Job → ElevenLabs → S3

3. Supervisor revisa
   Dashboard → POST /api/spell/validate

4. Laravel decide
   SpellResultValidated event

5. Laravel broadcast
   broadcast(new PlayerEliminated($player))

6. Reverb envía a todos
   Channel: 'game.show'

7. Echo recibe en Vue
   .listen('PlayerEliminated', callback)

8. Store actualiza
   gameStore.players[id].status = 'eliminated'

9. Vue re-renderiza
   PlayerCard muestra "ELIMINADO"

10. AudioService reproduce
    audio.play('jugador_eliminado.mp3')

11. ScreenComponent muestra
    <EliminatedScreen />
```

**Tiempo total esperado: <1 segundo**

## Escalabilidad

### Horizontal (Si Crece el Proyecto)

**Laravel:**

- Múltiples instancias PHP-FPM
- Load balancer (Traefik)
- Redis para broadcast (shared state)
- Base de datos replicada

**Reverb:**

- Reverb multi-instance con Redis adapter
- Sticky sessions en Traefik

**Vue:**

- CDN para assets estáticos
- Múltiples instancias Nginx

### Vertical (Para Familia)

- Un contenedor Laravel suficiente
- Un contenedor Vue suficiente
- RustFS S3 externo
- Base de datos compartida

## Diagrama Completo de Deployment

```
┌─────────────────────────────────────────────────────┐
│               Servidor (Dokploy)                     │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │            Traefik                          │    │
│  │  • SSL automático                           │    │
│  │  • Routing HTTP/WS                          │    │
│  └────────────────────────────────────────────┘    │
│         │                           │               │
│         ↓                           ↓               │
│  ┌─────────────┐           ┌─────────────┐        │
│  │  Laravel    │           │   Vue 3     │        │
│  │  + Reverb   │←─────────→│   (Nginx)   │        │
│  └─────────────┘           └─────────────┘        │
│         │                                           │
│         ↓                                           │
│  ┌─────────────┐           ┌─────────────┐        │
│  │    Redis    │           │     DB      │        │
│  └─────────────┘           └─────────────┘        │
└─────────────────────────────────────────────────────┘
                      │
                      ↓
              ┌──────────────┐
              │  RustFS (S3) │
              └──────────────┘
```

## Separación de Responsabilidades (Resumen)

| Responsabilidad  | Laravel | Vue          | Three.js   |
| ---------------- | ------- | ------------ | ---------- |
| Lógica de juego  | ✅      | ❌           | ❌         |
| Eliminaciones    | ✅      | ❌           | ❌         |
| WebSocket server | ✅      | ❌           | ❌         |
| WebSocket client | ❌      | ✅           | ❌         |
| Estado global    | ✅      | ✅ (copia)   | ❌         |
| Renderizado      | ❌      | ✅           | ❌         |
| Visual 3D        | ❌      | ❌           | ✅         |
| Audio playback   | ❌      | ✅           | Sincroniza |
| Audio generation | ✅      | ❌           | ❌         |
| Autenticación    | ✅      | ❌           | ❌         |
| Persistencia     | ✅      | LocalStorage | ❌         |

## Ventajas de Esta Arquitectura

✅ **Escalable**: Puedes crecer sin reescribir
✅ **Testeable**: Capas independientes
✅ **Mantenible**: Separación clara de responsabilidades
✅ **Segura**: Servidor autoritativo previene trampas
✅ **Reutilizable**: Backend sirve web + mobile
✅ **Moderna**: Stack actualizado (Laravel 12, Vue 3, WebGPU)
✅ **Desplegable**: Docker + Dokploy automático
✅ **Auditable**: Logs completos en servidor
