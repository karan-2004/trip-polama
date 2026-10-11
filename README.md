# TrailBrain

An offline-first, **split-brain** trip planner/manager for outdoor trips — built to
get people off the screen and into the world, with **open-source AI at its core**.

One local data store, two independent brains:

- **Local brain** (offline, no signal): expenses, offline map, "what next"
  suggestions, photo log, and buddy location tracking. Pure on-device compute.
- **Online brain** (open model): trip planning (itinerary, packing, budget) using
  open-weight LLMs + online resources.

The open model is what makes the split work: it can run fully on-device, so nothing
(location, money, photos) ever leaves your phone in the backcountry.

> This README is versioned with the project — it is updated every iteration. See
> [`plans/`](plans/) for the architecture and [`memory-bank/`](memory-bank/) for
> current project state.

## Stack

| Layer | Tech |
|---|---|
| App / PWA | Vite + React + TypeScript, `vite-plugin-pwa` |
| Local store | IndexedDB via Dexie.js |
| Offline map | MapLibre GL + PMTiles |
| Backend | Supabase (Auth + Postgres + Realtime + RLS) |
| AI | open-weight models — Ollama (dev), Groq/OpenRouter (proxy), WebLLM (on-device) |
| P2P | WebRTC DataChannel + Supabase Realtime |
| Tests | Vitest (unit) · Playwright (E2E, planned) |

## Quickstart

```bash
npm install        # install workspace deps
npm run dev        # start dev server → http://localhost:5173
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | typecheck + production build + PWA service worker |
| `npm run preview` | serve the built app |
| `npm run typecheck` | TypeScript across all workspaces |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests (one-shot) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run format` | Prettier |

## Project structure

```
trailbrain/
  apps/web/             # Vite + React PWA
  packages/core/        # shared types + pure brain logic (tested, framework-free)
  packages/store/       # Dexie schemas + typed repo
  packages/online-brain/# open-model client + offline fallback
  server/               # Cloudflare Worker: LLM proxy (later phases)
  plans/                # versioned architecture plans
  memory-bank/          # project memory (state, patterns, progress)
  .cursor/rules/        # agent rules
```

## How to test

```bash
npm test            # unit tests
npm run typecheck   # static types
npm run lint        # lint
```

To check offline behavior: `npm run build && npm run preview`, then toggle the
network offline in DevTools.

## Status

See [`memory-bank/progress.md`](memory-bank/progress.md) and
[`plans/`](plans/) for the current phase and roadmap. The build currently covers the
monorepo scaffold, PWA shell, core brain logic (settlement + suggestions), Dexie
store, and the online-brain planner with a deterministic offline fallback.
