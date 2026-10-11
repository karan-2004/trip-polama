# Tech Context — trip-polama

## Stack
- **Chat:** Ollama /api/chat adapter; Zod schemas infer model action types.
  Endpoint preferences saved locally, no browser API keys. WebLLM remains planned.
  Local manager uses Ollama; online planner uses a separate same-origin gateway.
  Active role and message role/model/source provenance persist in IndexedDB.
- **Planner gateway:** Node20/tsx loopback dev service, server/.env credentials,
  OpenAI-compatible model/tools/schema API. Wikipedia research plus optional Brave;
  four-round/six-tool budget, timeout and origin checks. Public auth is pending.
- **DB:** Schema v3 preserves prior records, adds chat sessions/messages and a
  compound [tripId+name] member-location index. Manual tools use the same records.
- **Runtime/build:** Node 20, npm 9, Vite + React + TypeScript.
- **PWA:** `vite-plugin-pwa` (service worker + manifest).
- **Local store:** IndexedDB via Dexie.js.
- **Map:** MapLibre GL 6 + OpenFreeMap Liberty style (online). PMTiles/offline
  downloads remain planned. Configurable style via VITE_MAP_STYLE_URL.
- **Map build:** Vite-bundled MapLibre worker; jsonlint 2.0.2 override keeps the
  transitive parser compatible with the project's Node 20 runtime.
- **Styling:** plain CSS (single `styles.css`). Deviation from the plan's Tailwind — chosen to keep deps minimal and move fast.
- **Design system:** light theme, nature palette (sky blue + green). See `.cursor/rules/design.mdc` for the enforced tokens.
- **Backend:** Supabase (Auth + Postgres + Realtime + RLS); Cloudflare Worker for the LLM proxy.
- **AI:** open-weight models — local Ollama (dev), Groq/OpenRouter (prod proxy), WebLLM (on-device).
- **P2P:** WebRTC DataChannel (manual signaling).

## Commands (planned)
- `npm run dev` — run web app.
- `npm run build` — production build.
- `npm run typecheck` — tsc --noEmit across workspaces.
- `npm run lint` — eslint.
- `npm test` — vitest run.
- `npm run e2e` — playwright.

## Constraints / notes
- The cursor rule `test-driven-development.mdc` references `pytest tests/ -v`; for this
  TypeScript project the equivalent is `npm test` (Vitest). Adapt, don't run pytest.
- No Ollama installed locally (as of 2026-10-11); plan for remote open-model proxy + optional local install.
- PWA background GPS stops when the phone locks — a known limit to document.
