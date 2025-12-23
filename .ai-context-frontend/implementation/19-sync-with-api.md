# 19 - Sync with API (Plan + Implementation)

## Goal

Synchronize frontend behaviors with the backend API and WebSocket contract. Ensure the app uses official endpoints for: join/reconnect, audit logs, supervisor actions (approve/reject audio, show controls), scoreboard, and game state. Implement client-side handlers, graceful error handling, and basic tests.

---

## Scope (what to sync)

- Auth flows: `POST /api/auth/player/join` and `POST /api/auth/player/reconnect` (already used by `auth.store` — verify payloads & error handling)
- Audit: `GET /api/supervisor/audit-logs` (list) and `/supervisor/audit-logs/{id}` (detail)
- Supervisor audio decisions: `POST /api/supervisor/audio/{audioPlay}/{approve|reject}` (map to `AudioReview.vue` behavior)
- Show controls: `POST /api/supervisor/shows/{show}/{start|pause|end}` (supervisor UI hooks)
- Scoreboard: `GET /api/shows/{show}/scoreboard` and `/shows/{show}/scoreboard/top` (use to fetch/refresh scoreboard)
- Game state snapshots: `GET /api/games/{game}/state` (on reconnect or state mismatch)
- Presence fallback: Ensure `players.store` can bootstrap players from an API endpoint (if available) or via a `state.snapshot` WS event.

---

## Implementation Plan (phases)

Phase A — Documentation & small API wrappers (Small)

- Add doc entries in `.ai-context-frontend/implementation/19-sync-with-api.md` (this file) mapping endpoints to frontend calls.
- Add `api` wrapper helpers where missing (we already have `useApi`).
- Add endpoints listing to `.ai-context-backend/openapi.yaml` references for clarity (if missing).

Phase B — Wire endpoints & UX improvements (Medium)

- Audit store: implement pagination and detail fetch using `/api/supervisor/audit-logs` and show loader/error states.
- AudioReview: switch to use `POST /api/supervisor/audio/{audioPlay}/{decision}` and handle 403/500; show disabled state while pending.
- Supervisor controls: add `SupervisorControls.vue` that calls `/api/supervisor/shows/{show}/{action}` (start/pause/end) and shows status.
- Scoreboard: add fetching in `scoreboard.store.ts` to get `/shows/{show}/scoreboard/top` periodically or on events.
- Player list bootstrap: implement optional `GET /api/shows/{show}/players` if backend implements it (fallback to presence or WS snapshot).

Phase C — Tests & polish (Small/Medium)

- Add unit tests for `audit.store` and `AudioReview` to simulate API responses (success, 403, 500).
- Add e2e scenario (Playwright) for supervisor approving audio and seeing scoreboard changes.

---

## Tasks (ordered, actionable)

1. Implement `src/modules/supervisor/api.ts` helper with typed methods (approveAudio, getAuditLogs, controlShow) (Small)
2. Update `AudioReview.vue` to call `supervisor.api.approveAudio` / `rejectAudio` and show per-item loading/disabled state (Small)
3. Update `audit.store.ts` to 1) fetch paginated logs from `/api/supervisor/audit-logs` 2) add `fetchDetail(id)` (Small)
4. Create `src/modules/supervisor/SupervisorControls.vue` and add to `SupervisorDashboard.vue` (Medium)
5. Update `scoreboard.store.ts` to fetch top N and expose `refresh()` (Medium)
6. Add optional `player.bootstrapFromApi(showId)` in `players.store` if `/api/shows/{show}/players` exists; fallback to presence (Medium)
7. Add tests: `audioReview.spec.ts` (unit), `auditStore.spec.ts` (unit), `supervisor.e2e.ts` (e2e) (Medium)

---

## Acceptance Criteria

- `AudioReview` uses the official supervisor audio endpoint; actions reflect server responses (403 shows "No autorizado", 200 removes item and shows success toast)
- `AuditViewer` loads real logs via API, supports pagination and shows meaningful messages on failure
- `SupervisorControls` can call start/pause/end and shows server response or error
- `Scoreboard` can fetch top N players via API and exposes `refresh()` for manual use
- Test coverage: unit tests for API integration logic; e2e covering approve audio flow

---

## Rollout

- Implement tasks 1–3 in a focused PR (small commits, each task independent).
- Once merged, implement tasks 4–6 in another PR with supervisor UI integration and scoreboard polling.
- Add tests in third PR.

---

If you agree, I will implement Task 1 now: create `src/modules/supervisor/supervisor.api.ts` with typed methods and then update `AudioReview.vue` to use it (task 2).
