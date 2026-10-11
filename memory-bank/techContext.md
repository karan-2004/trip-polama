# Tech Context — TrailBrain

## Stack
- **Runtime/build:** Node 20, npm 9, Vite + React + TypeScript.
- **PWA:** `vite-plugin-pwa` (service worker + manifest).
- **Local store:** IndexedDB via Dexie.js.
- **Map:** MapLibre GL + PMTiles (offline vector tiles).
- **Styling:** Tailwind CSS.
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
