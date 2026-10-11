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

## Trip Chat

Home centers on a persistent conversation, with trips alongside it. Use **Plan
a new adventure** to explore without creating a trip. Confirmed creation links
that chat to the trip and switches it to manager mode. Selecting an existing trip
opens its manager conversation; manual tools remain one click away.

The model proposes changes: **Confirm change** applies them, **Dismiss** rejects
them. Tools include trip details, members, expenses, current-device waypoints and
check-ins, visited stops, next-stop calculations and opening manual screens.
Photos/camera and remote map selection still need device/manual interaction.
Both interfaces share the store, and each reply gets fresh trip context.

### Connect a Model

Install/start [Ollama](https://ollama.com/) separately and pull an open model:

```bash
ollama pull llama3.2:3b
ollama serve
```

In **Model connection**, set the reachable endpoint (usually
`http://localhost:11434`) and installed model name. Optional defaults are
`VITE_OLLAMA_URL` and `VITE_OLLAMA_MODEL` in `apps/web/.env.local`.
If CORS blocks requests, allow the frontend origin using `OLLAMA_ORIGINS` when
starting the server. On a phone, localhost means the phone, not your development
computer; HTTPS/mixed-content and network access must also be configured.

The app does not install/download a model. Ollama is a separate server, not an
in-browser model; WebLLM remains planned. Without a reachable model, chats stay
saved and manual tools work; no simulated replies are generated. Model requests
send message text and structured trip details, excluding structured GPS fields
and images. Message text is sent as written. No live browsing, booking or automatic
sharing is performed.

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

### Live Model Smoke Test

With Ollama running and `llama3.2:3b` installed:

```bash
npm run test:live-model
# Override the server/model if needed:
OLLAMA_HOST=http://localhost:11434 OLLAMA_MODEL=llama3.2:3b npm run test:live-model
```

These opt-in tests use synthetic trip details, call the actual chat adapter and
validate exploration, trip creation and expense proposals. They do not execute
trip mutations or access your browser's stored trips. Normal `npm test` skips them.
The latest live run passed all three on llama3.2:3b; replies took roughly 30-47
seconds. This is a smoke test, not a guarantee across prompts or devices.
Ollama receives a generated JSON schema plus low-temperature options; local
validation and confirmation remain mandatory. CORS was checked for
`http://localhost:5173`; different frontend origins need their own check.

Measured coverage and a maintained `docs/testing.md` behavior matrix are planned
in [Plan v4](plans/v4-test-coverage.md). Coverage percentages, provider configuration
and CI coverage artifacts are not implemented yet; passing test counts are not
code-coverage measurements.

```bash
npm test            # unit tests
npm run typecheck   # static types
npm run lint        # lint
```

To check offline behavior: `npm run build && npm run preview`, then toggle the
network offline in DevTools.

## Status

Current plan: [Plan v4 - Test Coverage](plans/v4-test-coverage.md).
Chat history and action statuses persist in IndexedDB. Confirmations use scoped
transactions; duplicate execution and cross-trip waypoint changes are blocked.
Live inference, physical device tests and account sync remain pending.

Waypoints has an interactive MapLibre map: tap/click to select a stop, or pan
and use "Select map center", then name and save it. GPS is an alternative,
not a requirement for a map-selected stop. "Next up" plots your current position
and ranked suggestions, with "Show on map" controls. Pins are not routed trails.
Maps currently fetch OpenFreeMap tiles online; requests expose the viewed map
area to the tile provider. Offline map downloads remain planned. You can change
the style provider via `VITE_MAP_STYLE_URL` at build time.

Photos support an image picker and live camera capture (`getUserMedia`).
Selected images (up to 10 MB each) are previewed and stored in IndexedDB with
notes and timestamps only; Photos does not request or attach location. No server
upload occurs. "Open camera"
shows a live preview with "Capture photo" and "Close camera" controls; tracks stop
when the camera closes. Camera access needs HTTPS or localhost and permission.
If unavailable, use the separate image picker instead.
Original uploaded files may still contain embedded GPS/location metadata.
Stripping it is deferred in [Plan v2](plans/v2-photo-privacy.md), not implemented.

Location capture uses the device's browser geolocation, never manual coordinate
entry or raw coordinate display. Use "Find place name (online)" to resolve the
current fix through BigDataCloud; it receives the device coordinates. Resolved
names are saved with new records for offline display. Existing unnamed records
show "Saved location". Place lookup is optional and GPS works without it.

Location capture requires permission on HTTPS or localhost. Waypoints and check-ins
need a location fix; Photos does not use geolocation. Check-ins are
one-shot captures, not continuous tracking. Offline maps, remote member sharing and
on-device model inference are not implemented yet.

See [`memory-bank/progress.md`](memory-bank/progress.md) and
[`plans/`](plans/) for the current phase and roadmap. The build currently covers the
monorepo scaffold, PWA shell, core brain logic (settlement + suggestions), Dexie
store, and the online-brain planner with a deterministic offline fallback.
