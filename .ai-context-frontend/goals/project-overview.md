# Project Overview

## Nombre del Proyecto

**Ruleta Familiar** - Plataforma de Game Show en Tiempo Real

## Concepto General

Plataforma web de juegos tipo "game show" inspirada en el formato de SquidCraft, diseñada específicamente para uso familiar. El sistema permite que múltiples jugadores (hasta 50) participen en una serie de 4 juegos eliminatorios hasta coronar un único ganador.

## Audiencia Objetivo

- **Primario**: Familias que desean jugar juntos
- **Tamaño típico**: 10-30 jugadores por sesión
- **Capacidad máxima**: 50 jugadores simultáneos
- **Roles**: Jugadores + Supervisores (espectadores con permisos especiales)

## Características Clave

### 🎮 Sistema de Juegos

- **4 juegos diferentes**: Millonario, La Cuerda, Deletréalo, La Ruleta
- **Eliminación progresiva**: Cada ronda reduce matemáticamente el número de participantes
- **Juego final siempre**: La Ruleta siempre es el último juego y determina un único ganador

### 🌐 Arquitectura en Tiempo Real

- **WebSockets**: Comunicación bidireccional instantánea con Laravel Reverb
- **Servidor autoritativo**: Laravel 12 controla toda la lógica crítica del juego
- **Cliente reactivo**: Vue 3 renderiza estado y envía acciones de usuario

### 🎙️ Sistema de Audio Dinámico

- **Voz narrador**: Integración con ElevenLabs TTS (español colombiano)
- **Anuncios automatizados**: Eliminaciones, transiciones, eventos importantes
- **Ambiente sonoro**: Música y efectos según intensidad del juego
- **Audio auditable**: Grabaciones de jugadores en "Deletréalo" revisadas por supervisores

### 👁️ Sistema de Supervisión

- **Rol supervisor**: Espectadores con permisos especiales
- **Validación de jugadas**: Revisión de audios en "Deletréalo"
- **Moderación**: Control de chat y visibilidad total del estado del juego
- **Dashboard**: Panel de control con estadísticas en tiempo real

### 🔄 Sistema de Reconexión

- **PIN de 4 dígitos**: Asignado automáticamente al entrar
- **Recuperación de sesión**: Reingreso sin perder progreso si hay desconexión
- **Modo espectador**: Jugadores eliminados pueden seguir viendo

### 📊 Stat Cards

- **Información pública**: Nickname, color, número, estado, rol
- **Historial**: Fecha de entrada, fecha de eliminación
- **Persistencia**: Datos guardados incluso después de eliminación

## Inspiración vs. Diferencias

### Similar a SquidCraft

- Formato de eliminación progresiva
- Múltiples minijuegos
- Anuncios dramáticos
- Tensión creciente

### Diferencias clave

- **No es Minecraft**: Completamente web-based
- **Familiar**: Diseñado para todas las edades
- **Supervisable**: Control parental/familiar integrado
- **Auditable**: Sistema de revisión de jugadas
- **Autohospedable**: Deploy en infraestructura propia (Docker/Dokploy)

## Filosofía del Proyecto

1. **Servidor Autoritativo**: Laravel decide, Vue renderiza
2. **Eventos sobre Estado**: Comunicación por eventos de Reverb, no polling
3. **Visual sobre Mecánica**: Three.js para efectos, no para lógica crítica
4. **Reutilización**: Audios y assets cacheados en S3 (RustFS)
5. **Familiar Primero**: Moderación, supervisión, reconexión automática

## Objetivos de Experiencia

- **Tensión progresiva**: Cada juego aumenta la intensidad
- **Justicia**: Servidor autoritativo previene trampas
- **Inclusión**: Reconexión automática, rol espectador para eliminados
- **Espectáculo**: Visuales (Three.js), audio (ElevenLabs), efectos sincronizados
- **Memoria**: Stat cards y audios guardados como recuerdo

## Métricas de Éxito

- ✅ Soportar 50 jugadores simultáneos sin lag perceptible
- ✅ 0 inconsistencias de estado entre cliente y servidor
- ✅ Reconexión exitosa en <3 segundos
- ✅ Audio narrado en <500ms desde evento
- ✅ Tiempo de juego completo: 30-45 minutos para grupo grande
