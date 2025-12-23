# 18 - The things that are missing (Plan + Implementation tasks)

## Goal

Document and implement the missing player & supervisor bits across the frontend so the app provides a full onboarding flow (Home -> Lobby -> Game) and supervisors have robust tools (audio review, audit, permission UX). Start with small, high-impact quick wins then proceed to store unification, backend contract docs and tests.

---

## High-level scope

- Improve HomeView: add join/create form, call `auth.store.join`, support graceful fallback when backend is unavailable.
- Improve LobbyView: show `PlayerList`, session code and controls for supervisors.
- Wire Layouts: include `VersionDisplay` and other HUDs in `DefaultLayout` to expose app info.
- Supervisor UX hardening: show clear 403 handling on protected actions (approve/reject audio) and surface failure reasons.
- Audit: connect `audit.store.fetchRecent` with an API endpoint `/api/audit/recent` (fail gracefully if missing).
- Short-term tests: add a few unit tests for socket handlers and supervisor actions.

---

## Phase 1 — Quick wins (implement now)

Priority: High — small PRs, low risk.

1. Home onboarding form
   - Files: `src/views/HomeView.vue`, `src/modules/core/stores/auth.store.ts`
   - Tasks:
     - Add nickname + color form.
     - Call `auth.join(nickname, color)`; on success navigate to `/lobby`.
     - Show loading & error from `auth.store`.
   - Acceptance: User can join locally or via API and is redirected to `/lobby`.

2. Lobby: show live player list
   - Files: `src/views/LobbyView.vue`, `src/modules/player/PlayerList.vue`
   - Tasks:
     - Import and render `PlayerList` in the lobby (filtered `alive`).
     - Show a supervisor panel area (only visible if `auth.store.isSupervisor`).
   - Acceptance: Players visible in grid; supervisor panel appears if user is supervisor.

3. DefaultLayout header improvements
   - Files: `src/ui/layouts/DefaultLayout.vue`
   - Tasks:
     - Add `VersionDisplay` to the header (right side) so layout uses more components.
   - Acceptance: Version shown in header.

4. Supervisor 403 handling (audio review)
   - Files: `src/modules/supervisor/AudioReview.vue`
   - Tasks:
     - Catch 403 responses and show a clear `uiStore.error('No autorizado')` message.
     - If 403, disable approve/reject buttons for that session (optimistic); best-effort UI state.
   - Acceptance: 403 from API shows specific message and no repeated requests are possible.

5. Audit store -> API
   - Files: `src/modules/audit/audit.store.ts`, `src/modules/audit/AuditViewer.vue`
   - Tasks:
     - Replace `fetchRecent` placeholder with `useApi().get('/api/audit/recent')` call and error handling.
     - Add simple pagination params (page, limit) defaults.
   - Acceptance: AuditViewer shows real data when endpoint available and gracefully informs if the endpoint is missing.

---

## Phase 2 — Structural work (next)

Priority: Medium.

1. Player store ownership
   - Files: `src/modules/player/player.store.ts`, `src/modules/game/stores/*`, `src/modules/game/net/game.socket.ts`
   - Tasks:
     - Decide canonical player state (likely `players.store`), update game socket code to add/update players there.
     - Add a small adapter layer for any game-specific derived fields.
   - Acceptance: One source of truth for player data; socket events update it consistently.

2. Supervisor permission contracts & backend docs
   - Files to add: `.ai-context-backend/supervisor-api.md`, `.ai-context-backend/websockets.md`
   - Tasks:
     - Document supervisor endpoints (`/api/supervisor/*`) with payloads and 403/401 behaviors.
     - Submit PR for backend team review.
   - Acceptance: Contracts reviewed and accepted by backend.

3. Tests
   - Files: `tests/unit/*` and `tests/e2e/*`
   - Tasks:
     - Unit tests for socket listeners, audit fetch, and `AudioReview` 403 handling.
     - E2E scenario for join -> lobby -> audio validation paths.
   - Acceptance: New tests pass in CI.

---

## Phase 3 — Polishing & Advanced features

Priority: Low -> Medium.

- Add supervisor scoreboard editor and chat moderation UI.
- Add audio preloading per-scene and preload indicator in game scenes.
- Add comprehensive e2e for entire show flow.

---

## File-level mapping / checklist (what I will apply now)

- [x] `implementation/18-the things that are missing.md` (this document)
- [ ] `src/views/HomeView.vue` — add join form (implement now)
- [ ] `src/views/LobbyView.vue` — render `PlayerList` (implement now)
- [ ] `src/ui/layouts/DefaultLayout.vue` — add `VersionDisplay` (implement now)
- [ ] `src/modules/supervisor/AudioReview.vue` — add 403 handling (implement now)
- [ ] `src/modules/audit/audit.store.ts` — implement `fetchRecent` to call API (implement now)
- [ ] tests: create `tests/unit/audioReview.spec.ts`, `tests/unit/auditStore.spec.ts` (phase2)

---

## Acceptance criteria (short)

- Onboarding: join form works (calls API or falls back) and routes to `/lobby`.
- Lobby: `PlayerList` visible and updates when store changes.
- Supervisor: 403 from endpoints shows clear message and disables actions.
- Audit: AuditViewer loads remote entries when endpoint exists, otherwise shows a friendly message.
- All changes type-checked and built successfully.

---

If this plan looks good, I will implement Phase 1 tasks now in small, reviewable commits and open a PR with the changes.
