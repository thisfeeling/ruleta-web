# Game Goals

## Objetivo del Juego

Crear una experiencia de "game show" familiar donde **30+ jugadores compiten en 4 juegos eliminatorios** hasta que solo uno quede como ganador final.

## Flujo de Juego Completo

```
LOBBY (todos)
  ↓
JUEGO DEL MILLONARIO (eliminación masiva inicial)
  ↓
DELETRÉALO (eliminación individual, tensión)
  ↓
LA CUERDA (eliminación por grupos)
  ↓
JUEGO DEL MILLONARIO (segunda ronda)
  ↓
DELETRÉALO (segunda ronda)
  ↓
LA RULETA (FINAL - solo 1 ganador)
  ↓
PANTALLA DE GANADOR
```

## Matemáticas de Eliminación

### Principio Fundamental

**El sistema debe funcionar con cualquier cantidad de jugadores** (par o impar), ajustando dinámicamente el ritmo de eliminación.

### Ejemplo con 30 jugadores

| Juego          | Jugadores Entrantes | Mecánica    | Jugadores Salientes |
| -------------- | ------------------- | ----------- | ------------------- |
| Millonario (1) | 30                  | Preguntas   | ~15-20              |
| Deletréalo (1) | 15-20               | Individual  | ~12-15              |
| La Cuerda      | 12-15               | Grupos      | ~6-10               |
| Millonario (2) | 6-10                | Preguntas   | ~4-6                |
| Deletréalo (2) | 4-6                 | Individual  | ~3-5                |
| Ruleta FINAL   | 3-5                 | Acumulación | 1 GANADOR           |

### Reglas de Ajuste Dinámico

**Millonario:**

- Laravel decide cuántas preguntas según jugadores restantes
- Objetivo: reducir ~40-50% en cada ronda

**Deletréalo:**

- 1 jugador eliminado por turno
- Cantidad de turnos según tiempo/jugadores

**La Cuerda:**

- Grupos de ~5 jugadores (ideal)
- Grupos impares permitidos (3-4 en último grupo)
- Se elimina EL GRUPO COMPLETO que pierda

**Ruleta:**

- No importa cuántos lleguen (puede ser 2, 3, 5, 10)
- Solo 1 gana, todos los demás eliminados

## Objetivos de Experiencia por Juego

### 🎯 Juego del Millonario

**Objetivo:** Reducción rápida de masa inicial

- Mantener atención de todos
- Preguntas rápidas (15-20 seg)
- Ritmo alto
- Cooldown a incorrectos (no eliminación inmediata)

**Tensión:** Media al inicio, aumenta con cada pregunta

### 🎯 Deletréalo

**Objetivo:** Momentos individuales de alta tensión

- Un jugador a la vez bajo presión
- Todos los demás observan
- Audio grabado y revisado
- Eliminación directa si falla

**Tensión:** Muy alta para el jugador activo, suspenso para los demás

### 🎯 La Cuerda

**Objetivo:** Trabajo en equipo y competencia visual

- Grupos compiten
- Visual 3D impactante
- Colaboración dentro del grupo
- Eliminación grupal (dramático)

**Tensión:** Alta, colectiva, caótica

### 🎯 La Ruleta (FINAL)

**Objetivo:** Clímax del show, victoria definitiva

- Solo sobrevivientes
- Suerte + estrategia (timing)
- Acumulación progresiva
- Único ganador posible

**Tensión:** Máxima, insostenible

## Sistema de Transiciones

### Pantallas Obligatorias

**PASASTE:**

- Jugador avanza a siguiente ronda
- Audio celebratorio
- Animación verde/dorada
- Duración: 3-5 segundos

**ELIMINADO:**

- Jugador sale del juego
- Audio narrado con su número
- Animación roja/oscura
- Duración: 5-8 segundos
- Pasa a modo espectador

**ENTRE JUEGOS:**

- Countdown
- Explicación de reglas siguiente juego
- Audio narrador
- Preparación mental

## Balanceo del Show

### Tiempos Estimados (30 jugadores)

| Fase           | Duración Estimada |
| -------------- | ----------------- |
| Lobby + Intro  | 2-3 min           |
| Millonario (1) | 8-10 min          |
| Deletréalo (1) | 6-8 min           |
| La Cuerda      | 5-7 min           |
| Millonario (2) | 5-6 min           |
| Deletréalo (2) | 4-5 min           |
| Ruleta Final   | 8-12 min          |
| **TOTAL**      | **38-51 min**     |

### Ajustes Dinámicos

**Más jugadores (40-50):**

- Más preguntas en Millonario
- Más turnos en Deletréalo
- Más grupos en La Cuerda

**Menos jugadores (10-15):**

- Menos preguntas
- Transición rápida a Ruleta
- Posible saltar segunda ronda de Millonario

## Objetivos de Jugabilidad

### ✅ Debe sentirse:

- Justo (servidor autoritativo)
- Tenso pero divertido
- Familiar (no tóxico)
- Espectacular (audio/visual)
- Memorable (stat cards, grabaciones)

### ❌ NO debe sentirse:

- Injusto por lag
- Aburrido (ritmo lento)
- Frustrante por bugs
- Solo suerte (balance skill/azar)

## Roles en el Juego

### Jugador Activo

- Participa en todos los juegos
- Puede ser eliminado
- Puede reconectarse si desconecta
- Ve su stat card en tiempo real

### Jugador Eliminado (Espectador)

- Ya no juega
- Sigue viendo el show
- Puede chatear
- Ve stat cards de todos
- Puede salir sin consecuencias

### Supervisor

- Nunca juega
- Ve TODO en tiempo real
- Valida audios de Deletréalo
- Puede moderar chat
- Puede pausar/reanudar (opcional)
- Dashboard completo

## Métricas de Éxito del Juego

- ✅ 90%+ de jugadores terminan el show (no abandonan)
- ✅ Eliminados siguen viendo hasta el final
- ✅ 0 quejas de injusticia técnica
- ✅ Ganador se determina en <1 hora
- ✅ Todos quieren jugar de nuevo

## Sistema de Reconexión

**Caso: Jugador pierde WiFi**

1. Detecta desconexión
2. Intenta reconexión automática
3. Si falla, muestra pantalla PIN
4. Jugador elige su número + nickname
5. Ingresa PIN de 4 dígitos
6. Regresa al estado actual del juego

**Garantías:**

- Si estaba vivo, sigue vivo
- Si fue eliminado mientras off, lo notifica
- Puede seguir como espectador

## Moderación Familiar

### Control de Supervisores

- Silenciar jugadores en chat
- Invalidar audios inapropiados en Deletréalo
- Pausar el juego en emergencia
- Ver logs de eventos

### Prevención

- Rate limiting en chat
- Filtro de palabras (opcional)
- Solo texto + emojis (no imágenes)
- Audios guardados para revisión posterior
