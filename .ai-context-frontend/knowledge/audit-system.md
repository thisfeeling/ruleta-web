# Sistema de Auditoría (Audit System)

> **Transparencia Total**: Registra TODAS las acciones de jugadores y supervisores  
> **Dual Storage**: DB (30 días, queries) + RustFS/S3 (histórico completo)  
> **Inmutabilidad**: Write-only logs, nunca se modifican

---

## 📋 Índice

1. [Arquitectura General](#arquitectura-general)
2. [Dual Storage Strategy](#dual-storage-strategy)
3. [Modelo de Datos](#modelo-de-datos)
4. [Tipos de Eventos Auditados](#tipos-de-eventos-auditados)
5. [Backend Service](#backend-service)
6. [API Endpoints](#api-endpoints)
7. [Frontend UI](#frontend-ui)
8. [WebSocket Events](#websocket-events)
9. [Queries y Reporting](#queries-y-reporting)
10. [Implementación](#implementación)

---

## Arquitectura General

### Principio Core

**Write-only immutable logs**: Cada acción genera un registro inmutable que NUNCA se modifica ni elimina.

```
Player/Supervisor Action
    ↓
Laravel Controller
    ↓
AuditService::log($actor, $action, $context, $metadata)
    ↓
┌─────────────────────┬──────────────────────┐
│   DB (Hot Storage)  │  RustFS (Cold Storage)│
│   30 días recientes │  Histórico completo   │
│   Queries rápidas   │  Archivo permanente   │
│   Índices optimized │  JSON estructurado    │
└─────────────────────┴──────────────────────┘
    ↓                        ↓
WebSocket: AuditLogCreated   S3 Object Key
    ↓
Supervisor Dashboard
```

### Flujo de Datos

```typescript
// Ejemplo: Jugador completa Word Search
{
  actor_id: 37,
  actor_type: 'player',
  action: 'game.completed',
  target_type: 'game',
  target_id: 'word_search',
  context: {
    round_id: 12,
    completion_time_ms: 45230,
    words_found: 12,
    grid_seed: 'abc123'
  },
  metadata: {
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0...',
    session_id: 'sess_xyz789'
  },
  timestamp: '2025-12-21T15:30:45.123Z'
}
```

---

## Dual Storage Strategy

### Hot Storage: MySQL/PostgreSQL (30 días)

**Propósito**: Queries rápidas, reportes en tiempo real, debugging activo

**Características**:

- Tabla `audit_logs` con índices optimizados
- Retención: 30 días (configurable)
- Auto-purge diario vía cron
- Full-text search en `context` JSON
- Particionado por fecha

**Ventajas**:

- Queries < 100ms
- Joins con otras tablas (users, games, rounds)
- Agregaciones rápidas (COUNT, GROUP BY)

### Cold Storage: RustFS/S3 (infinito)

**Propósito**: Archivo histórico, compliance, análisis de largo plazo

**Características**:

- Un archivo JSON por día: `audits/2025/12/21.json`
- Compresión gzip
- Versionado S3
- Inmutabilidad garantizada
- Replicación multi-región

**Ventajas**:

- Costo bajo (S3 Glacier)
- Escalabilidad infinita
- No afecta performance de DB
- Recuperación ante desastres

### Flujo de Datos

```
Log Event
    ↓
┌─> DB Insert (audit_logs)
│   └─> Indexed, ready for queries
│
└─> Queue Job (async)
    └─> Append to daily S3 file
        └─> audits/2025/12/21.json.gz
```

### Purge Strategy

```php
// Cron: Diario a las 2 AM
php artisan audit:purge --days=30

// Proceso:
// 1. SELECT logs older than 30 days
// 2. Verify S3 backup exists
// 3. DELETE from audit_logs
// 4. Log purge event (meta-audit)
```

---

## Modelo de Datos

### Tabla: `audit_logs`

```sql
CREATE TABLE audit_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,

  -- Actor (quien realizó la acción)
  actor_id BIGINT NOT NULL,
  actor_type ENUM('player', 'supervisor', 'system') NOT NULL,

  -- Action (qué se hizo)
  action VARCHAR(100) NOT NULL,  -- 'game.started', 'player.eliminated', 'supervisor.override'

  -- Target (sobre qué/quién)
  target_type VARCHAR(50) NULL,  -- 'player', 'game', 'round', 'audio'
  target_id VARCHAR(100) NULL,

  -- Context (datos específicos)
  context JSON NOT NULL,

  -- Metadata (info técnica)
  metadata JSON NULL,  -- { ip, user_agent, session_id, request_id }

  -- Timestamp
  created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),

  -- Indices
  INDEX idx_actor (actor_id, actor_type),
  INDEX idx_action (action),
  INDEX idx_target (target_type, target_id),
  INDEX idx_created_at (created_at),
  INDEX idx_actor_created (actor_id, created_at)
) PARTITION BY RANGE (UNIX_TIMESTAMP(created_at)) (
  PARTITION p_current VALUES LESS THAN (UNIX_TIMESTAMP('2026-01-01')),
  PARTITION p_future VALUES LESS THAN (MAXVALUE)
);
```

### TypeScript Interface

```typescript
// src/types/audit.types.ts

export type ActorType = 'player' | 'supervisor' | 'system'

export type AuditAction =
  // Game events
  | 'game.started'
  | 'game.completed'
  | 'game.aborted'
  // Player events
  | 'player.joined'
  | 'player.eliminated'
  | 'player.reconnected'
  | 'player.action'
  // Supervisor events
  | 'supervisor.round_created'
  | 'supervisor.round_started'
  | 'supervisor.audio_validated'
  | 'supervisor.force_end'
  | 'supervisor.override'
  // System events
  | 'system.purge'
  | 'system.backup'
  | 'system.error'

export interface AuditLog {
  id: number
  actor_id: number
  actor_type: ActorType
  action: AuditAction
  target_type: string | null
  target_id: string | null
  context: Record<string, any>
  metadata: {
    ip_address?: string
    user_agent?: string
    session_id?: string
    request_id?: string
  }
  created_at: string
}

export interface AuditSearchParams {
  actor_id?: number
  actor_type?: ActorType
  action?: AuditAction | AuditAction[]
  target_type?: string
  target_id?: string
  date_from?: string
  date_to?: string
  limit?: number
  offset?: number
}
```

---

## Tipos de Eventos Auditados

### 🎮 Game Events

| Action           | Actor      | Target | Context Example                         |
| ---------------- | ---------- | ------ | --------------------------------------- |
| `game.started`   | system     | round  | `{ round_id, game_type, player_count }` |
| `game.completed` | player     | game   | `{ round_id, score, time_ms, rank }`    |
| `game.aborted`   | supervisor | round  | `{ reason, players_affected }`          |

### 👤 Player Events

| Action                    | Actor  | Target   | Context Example                                    |
| ------------------------- | ------ | -------- | -------------------------------------------------- |
| `player.joined`           | player | session  | `{ nickname, number, color }`                      |
| `player.eliminated`       | system | player   | `{ game_type, reason, score_final }`               |
| `player.reconnected`      | player | session  | `{ pin_used, disconnected_duration_ms }`           |
| `player.action`           | player | game     | `{ action_type, payload, timestamp_ms }`           |
| `player.answer_submitted` | player | question | `{ question_id, answer, correct, time_ms }`        |
| `player.spell_recorded`   | player | word     | `{ word, audio_url, duration_ms }`                 |
| `player.rope_push`        | player | team     | `{ push_count, timestamp_ms, team_id }`            |
| `player.roulette_spin`    | player | wheel    | `{ spin_duration, points_won, total_accumulated }` |
| `player.word_found`       | player | grid     | `{ word, position, time_ms }`                      |
| `player.flappy_crash`     | player | game     | `{ time_survived_ms, obstacles_passed }`           |

### 👮 Supervisor Events

| Action                       | Actor      | Target | Context Example                                   |
| ---------------------------- | ---------- | ------ | ------------------------------------------------- |
| `supervisor.round_created`   | supervisor | round  | `{ game_type, config, scheduled_at }`             |
| `supervisor.round_started`   | supervisor | round  | `{ player_count, groups_assigned }`               |
| `supervisor.audio_uploaded`  | supervisor | audio  | `{ file_name, s3_key, duration_ms }`              |
| `supervisor.audio_validated` | supervisor | audio  | `{ player_id, word, approved, reason }`           |
| `supervisor.force_end`       | supervisor | round  | `{ reason, players_remaining }`                   |
| `supervisor.override`        | supervisor | player | `{ action, old_value, new_value, justification }` |
| `supervisor.bonus_activated` | supervisor | game   | `{ game_type, player_count }`                     |

### 🤖 System Events

| Action          | Actor  | Target     | Context Example                                  |
| --------------- | ------ | ---------- | ------------------------------------------------ |
| `system.purge`  | system | audit_logs | `{ records_deleted, date_range, s3_verified }`   |
| `system.backup` | system | database   | `{ size_mb, duration_ms, s3_path }`              |
| `system.error`  | system | null       | `{ error_type, message, stack_trace, severity }` |

---

## Backend Service

### `AuditService.php`

```php
namespace App\Services;

use App\Models\AuditLog;
use App\Events\AuditLogCreated;
use App\Jobs\AppendAuditToS3;
use Illuminate\Support\Facades\DB;

class AuditService
{
    /**
     * Log una acción auditable
     */
    public function log(
        int $actorId,
        string $actorType,
        string $action,
        ?string $targetType = null,
        ?string $targetId = null,
        array $context = [],
        array $metadata = []
    ): AuditLog {
        // Auto-inject metadata
        $enrichedMetadata = array_merge([
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'session_id' => session()->getId(),
            'request_id' => request()->header('X-Request-ID'),
        ], $metadata);

        DB::beginTransaction();

        try {
            // Insert to DB (hot storage)
            $auditLog = AuditLog::create([
                'actor_id' => $actorId,
                'actor_type' => $actorType,
                'action' => $action,
                'target_type' => $targetType,
                'target_id' => $targetId,
                'context' => $context,
                'metadata' => $enrichedMetadata
            ]);

            DB::commit();

            // Async: Append to S3 (cold storage)
            AppendAuditToS3::dispatch($auditLog)->onQueue('audit');

            // Broadcast to supervisors
            broadcast(new AuditLogCreated($auditLog))->toOthers();

            return $auditLog;

        } catch (\Exception $e) {
            DB::rollBack();

            // Fallback: Write to file si DB falla
            $this->logToFile($actorId, $actorType, $action, $context, $e);

            throw $e;
        }
    }

    /**
     * Buscar logs con filtros
     */
    public function search(array $params): \Illuminate\Pagination\LengthAwarePaginator
    {
        $query = AuditLog::query();

        if (isset($params['actor_id'])) {
            $query->where('actor_id', $params['actor_id']);
        }

        if (isset($params['actor_type'])) {
            $query->where('actor_type', $params['actor_type']);
        }

        if (isset($params['action'])) {
            if (is_array($params['action'])) {
                $query->whereIn('action', $params['action']);
            } else {
                $query->where('action', $params['action']);
            }
        }

        if (isset($params['target_type'])) {
            $query->where('target_type', $params['target_type']);
        }

        if (isset($params['target_id'])) {
            $query->where('target_id', $params['target_id']);
        }

        if (isset($params['date_from'])) {
            $query->where('created_at', '>=', $params['date_from']);
        }

        if (isset($params['date_to'])) {
            $query->where('created_at', '<=', $params['date_to']);
        }

        return $query->orderBy('created_at', 'desc')
            ->paginate($params['limit'] ?? 50);
    }

    /**
     * Purgar logs antiguos (mantener 30 días en DB)
     */
    public function purge(int $days = 30): int
    {
        $cutoffDate = now()->subDays($days);

        $count = DB::table('audit_logs')
            ->where('created_at', '<', $cutoffDate)
            ->delete();

        // Log the purge itself
        $this->log(
            actorId: 0,
            actorType: 'system',
            action: 'system.purge',
            context: [
                'records_deleted' => $count,
                'cutoff_date' => $cutoffDate->toIso8601String(),
                'retention_days' => $days
            ]
        );

        return $count;
    }

    /**
     * Fallback: Log to file si DB falla
     */
    private function logToFile(int $actorId, string $actorType, string $action, array $context, \Exception $e): void
    {
        $logPath = storage_path('logs/audit-fallback.log');

        $entry = json_encode([
            'timestamp' => now()->toIso8601String(),
            'actor_id' => $actorId,
            'actor_type' => $actorType,
            'action' => $action,
            'context' => $context,
            'error' => $e->getMessage()
        ]) . PHP_EOL;

        file_put_contents($logPath, $entry, FILE_APPEND | LOCK_EX);
    }
}
```

### Job: `AppendAuditToS3.php`

```php
namespace App\Jobs;

use App\Models\AuditLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class AppendAuditToS3 implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        private AuditLog $auditLog
    ) {}

    public function handle(): void
    {
        $date = $this->auditLog->created_at;
        $filePath = sprintf(
            'audits/%d/%02d/%02d.json',
            $date->year,
            $date->month,
            $date->day
        );

        $disk = Storage::disk('s3'); // RustFS compatible

        // Read existing content (si existe)
        $existing = $disk->exists($filePath)
            ? json_decode($disk->get($filePath), true)
            : [];

        // Append new log
        $existing[] = $this->auditLog->toArray();

        // Write back (gzip opcional)
        $disk->put($filePath, json_encode($existing, JSON_PRETTY_PRINT));
    }
}
```

---

## API Endpoints

```php
// routes/api.php

Route::middleware(['auth:sanctum', 'role:supervisor'])->prefix('audit')->group(function () {
    // Search logs
    Route::get('/logs', [AuditController::class, 'search']);

    // Get specific log
    Route::get('/logs/{id}', [AuditController::class, 'show']);

    // Get player timeline
    Route::get('/players/{player}/timeline', [AuditController::class, 'playerTimeline']);

    // Get round audit trail
    Route::get('/rounds/{round}/audit', [AuditController::class, 'roundAudit']);

    // Export to CSV
    Route::post('/export', [AuditController::class, 'export']);

    // Stats
    Route::get('/stats', [AuditController::class, 'stats']);
});
```

### Controller: `AuditController.php`

```php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\Request;

class AuditController extends Controller
{
    public function __construct(
        private AuditService $auditService
    ) {}

    public function search(Request $request)
    {
        $validated = $request->validate([
            'actor_id' => 'nullable|integer',
            'actor_type' => 'nullable|in:player,supervisor,system',
            'action' => 'nullable|string',
            'target_type' => 'nullable|string',
            'target_id' => 'nullable|string',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
            'limit' => 'nullable|integer|min:1|max:100'
        ]);

        $results = $this->auditService->search($validated);

        return response()->json($results);
    }

    public function show(AuditLog $auditLog)
    {
        return response()->json($auditLog);
    }

    public function playerTimeline(User $player)
    {
        $logs = AuditLog::where('actor_id', $player->id)
            ->where('actor_type', 'player')
            ->orderBy('created_at', 'desc')
            ->paginate(100);

        return response()->json([
            'player' => $player,
            'timeline' => $logs
        ]);
    }

    public function roundAudit(int $roundId)
    {
        $logs = AuditLog::whereJsonContains('context->round_id', $roundId)
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json([
            'round_id' => $roundId,
            'events' => $logs
        ]);
    }

    public function stats()
    {
        $stats = [
            'total_logs' => AuditLog::count(),
            'logs_today' => AuditLog::whereDate('created_at', today())->count(),
            'by_action' => AuditLog::select('action', DB::raw('count(*) as count'))
                ->groupBy('action')
                ->orderBy('count', 'desc')
                ->limit(10)
                ->get(),
            'by_actor_type' => AuditLog::select('actor_type', DB::raw('count(*) as count'))
                ->groupBy('actor_type')
                ->get()
        ];

        return response()->json($stats);
    }
}
```

---

## Frontend UI

### Pinia Store: `audit.store.ts`

```typescript
// src/modules/supervisor/audit/audit.store.ts

import { defineStore } from 'pinia'
import type { AuditLog, AuditSearchParams } from '@/types/audit.types'
import { apiService } from '@/modules/core/services/api.service'

interface AuditState {
  logs: AuditLog[]
  currentPage: number
  totalPages: number
  loading: boolean
  error: string | null
}

export const useAuditStore = defineStore('audit', {
  state: (): AuditState => ({
    logs: [],
    currentPage: 1,
    totalPages: 1,
    loading: false,
    error: null,
  }),

  actions: {
    async searchLogs(params: AuditSearchParams) {
      this.loading = true
      this.error = null

      try {
        const { data } = await apiService.get('/audit/logs', { params })
        this.logs = data.data
        this.currentPage = data.current_page
        this.totalPages = data.last_page
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    async getPlayerTimeline(playerId: number) {
      this.loading = true
      try {
        const { data } = await apiService.get(`/audit/players/${playerId}/timeline`)
        return data.timeline
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    async getRoundAudit(roundId: number) {
      this.loading = true
      try {
        const { data } = await apiService.get(`/audit/rounds/${roundId}/audit`)
        return data.events
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    handleAuditLogCreated(payload: AuditLog) {
      // Prepend to logs si estamos en página 1
      if (this.currentPage === 1) {
        this.logs.unshift(payload)

        // Mantener max 50 logs en memoria
        if (this.logs.length > 50) {
          this.logs.pop()
        }
      }
    },
  },
})
```

### Componente: `AuditTimeline.vue`

```vue
<!-- src/modules/supervisor/audit/AuditTimeline.vue -->

<template>
  <div class="audit-timeline">
    <h2 class="text-2xl font-bold mb-4">📋 Auditoría de Eventos</h2>

    <!-- Filters -->
    <div class="filters mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
      <select v-model="filters.actor_type" class="select select-bordered">
        <option value="">Todos los actores</option>
        <option value="player">Jugadores</option>
        <option value="supervisor">Supervisores</option>
        <option value="system">Sistema</option>
      </select>

      <input
        v-model="filters.action"
        type="text"
        placeholder="Filtrar por acción..."
        class="input input-bordered"
      />

      <input v-model="filters.date_from" type="date" class="input input-bordered" />

      <button class="btn btn-primary" @click="search">Buscar</button>
    </div>

    <!-- Timeline -->
    <div class="timeline-container">
      <div v-if="auditStore.loading" class="loading loading-spinner loading-lg"></div>

      <div v-else-if="auditStore.logs.length === 0" class="alert alert-info">
        No se encontraron registros de auditoría.
      </div>

      <div v-else class="space-y-2">
        <div v-for="log in auditStore.logs" :key="log.id" class="card bg-base-200">
          <div class="card-body p-4">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span :class="getActorBadgeClass(log.actor_type)">
                    {{ log.actor_type }}
                  </span>
                  <span class="font-mono text-sm">{{ log.action }}</span>
                  <span class="text-xs opacity-50">
                    {{ formatTimestamp(log.created_at) }}
                  </span>
                </div>

                <div v-if="log.target_type" class="text-sm opacity-70 mt-1">
                  Target: {{ log.target_type }} #{{ log.target_id }}
                </div>

                <details class="mt-2">
                  <summary class="cursor-pointer text-sm text-primary">Ver contexto</summary>
                  <pre class="text-xs mt-2 p-2 bg-base-300 rounded overflow-auto">{{
                    JSON.stringify(log.context, null, 2)
                  }}</pre>
                </details>
              </div>

              <button class="btn btn-sm btn-ghost" @click="viewDetails(log)">Detalles</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div class="join mt-6">
        <button class="join-item btn" :disabled="auditStore.currentPage === 1" @click="prevPage">
          Anterior
        </button>
        <button class="join-item btn">
          Página {{ auditStore.currentPage }} de {{ auditStore.totalPages }}
        </button>
        <button
          class="join-item btn"
          :disabled="auditStore.currentPage === auditStore.totalPages"
          @click="nextPage"
        >
          Siguiente
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuditStore } from './audit.store'

const auditStore = useAuditStore()

const filters = ref({
  actor_type: '',
  action: '',
  date_from: '',
  date_to: '',
})

function search() {
  auditStore.searchLogs(filters.value)
}

function prevPage() {
  if (auditStore.currentPage > 1) {
    filters.value.offset = (auditStore.currentPage - 2) * 50
    search()
  }
}

function nextPage() {
  if (auditStore.currentPage < auditStore.totalPages) {
    filters.value.offset = auditStore.currentPage * 50
    search()
  }
}

function getActorBadgeClass(actorType: string) {
  const classes = {
    player: 'badge badge-info',
    supervisor: 'badge badge-warning',
    system: 'badge badge-neutral',
  }
  return classes[actorType] || 'badge'
}

function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString('es-CO')
}

function viewDetails(log: any) {
  // Open modal with full details
  console.log('View details:', log)
}

// Auto-fetch on mount
search()
</script>
```

---

## WebSocket Events

### Evento: `AuditLogCreated`

**Canal**: `private-supervisor.{supervisorId}`

```json
{
  "event": "AuditLogCreated",
  "data": {
    "id": 12345,
    "actor_id": 37,
    "actor_type": "player",
    "action": "player.spell_recorded",
    "target_type": "word",
    "target_id": "JAPON",
    "context": {
      "round_id": 12,
      "audio_url": "https://s3.../audio_37_japon.mp3",
      "duration_ms": 2340
    },
    "metadata": {
      "ip_address": "192.168.1.100",
      "session_id": "sess_xyz789"
    },
    "created_at": "2025-12-21T15:30:45.123Z"
  }
}
```

---

## Queries y Reporting

### Query Examples

```sql
-- Top 10 acciones más frecuentes
SELECT action, COUNT(*) as count
FROM audit_logs
WHERE created_at >= NOW() - INTERVAL 7 DAY
GROUP BY action
ORDER BY count DESC
LIMIT 10;

-- Jugadores más activos hoy
SELECT actor_id, COUNT(*) as actions
FROM audit_logs
WHERE actor_type = 'player'
  AND DATE(created_at) = CURDATE()
GROUP BY actor_id
ORDER BY actions DESC
LIMIT 20;

-- Supervisores que más audios validaron esta semana
SELECT actor_id, COUNT(*) as validations
FROM audit_logs
WHERE action = 'supervisor.audio_validated'
  AND created_at >= NOW() - INTERVAL 7 DAY
GROUP BY actor_id
ORDER BY validations DESC;

-- Errores del sistema en las últimas 24h
SELECT *
FROM audit_logs
WHERE action = 'system.error'
  AND created_at >= NOW() - INTERVAL 24 HOUR
ORDER BY created_at DESC;
```

---

## Implementación

### Fase 1: Base de Datos

1. Crear migración `create_audit_logs_table.php` con particionado
2. Configurar índices optimizados
3. Setup purge automático (cron)

### Fase 2: Backend Service

1. Implementar `AuditService.php`
2. Crear `AppendAuditToS3` job
3. Configurar S3/RustFS disk
4. Integrar en todos los controllers

### Fase 3: Frontend

1. Crear `audit.store.ts`
2. Componente `AuditTimeline.vue`
3. Integrar en SupervisorDashboard

### Fase 4: Reporting

1. Dashboard de estadísticas
2. Exports CSV/JSON
3. Alertas de anomalías

---

## Notas de Implementación

### Performance

- Usar índices compuestos: `(actor_id, created_at)`, `(action, created_at)`
- Particionado por fecha (mensual o trimestral)
- Async job para S3 (no bloquear request)
- Caché de stats en Redis (TTL 5 min)

### Seguridad

- Solo supervisores pueden acceder a auditoría
- No exponer IP/user_agent a jugadores
- Rate limiting en endpoints de búsqueda
- Validar permissions para ver logs de otros supervisores

### Compliance

- Logs inmutables (no UPDATE, no DELETE manual)
- Timestamp con microsegundos (precisión)
- Replicación S3 multi-región
- Encriptación en reposo (S3 SSE)

---

**Última actualización**: Diciembre 21, 2025  
**Autor**: Sistema de Auditoría - Transparencia Total  
**Prioridad**: ALTA - Implementar con primeros juegos
