# trip-polama

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

**Implemented routing:** the planner uses a server-configured larger online LLM with resource-access tools
for source-backed trip research and planning. The manager uses a lightweight local
model to read/write trip data, give summaries and respond quickly. Existing trips
can explicitly request online replanning without losing their manager conversation.

New/exploratory chats use the online planner gateway. Saved trips default to the
local manager. **Research / Replan online** and **Return to local manager** switch
agents explicitly in the same persistent conversation. Messages retain role/model
provenance and retrieved source links. Local failures never silently use the cloud.
The online provider/model still needs configuration; it is not auto-selected.

Home centers on a persistent conversation, with trips alongside it. Use **Plan
a new adventure** to explore without creating a trip. Confirmed creation links
that chat to the trip and switches it to manager mode. Selecting an existing trip
opens its manager conversation; manual tools remain one click away.

The model proposes changes: **Confirm change** applies them, **Dismiss** rejects
them. Tools include trip details, members, expenses, current-device waypoints and
check-ins, visited stops, next-stop calculations and opening manual screens.
Photos/camera and remote map selection still need device/manual interaction.
Both interfaces share the store, and each reply gets fresh trip context.

### Connect the Local Manager

Install/start [Ollama](https://ollama.com/) separately and pull an open model:

```bash
ollama pull llama3.2:3b
ollama serve
```

Developer configuration: set `VITE_OLLAMA_URL` (usually
`http://localhost:11434`) and `VITE_OLLAMA_MODEL` in `apps/web/.env.local`, then
restart Vite. Previously saved local connection preferences remain supported.
Connection forms and developer setup instructions are not part of the product UI.
If CORS blocks requests, allow the frontend origin using `OLLAMA_ORIGINS` when
starting the server. On a phone, localhost means the phone, not your development
computer; HTTPS/mixed-content and network access must also be configured.

The app does not install/download a model. Ollama is a separate local server, not
in-browser WebLLM. Use a trusted local endpoint. The manager gets compact recent
history, expense aggregates and saved trip data; it has no web research. It proposes
at most one requested action per reply for reliability. Writes await confirmation.
Latest warm local tests took about 22-31 seconds, still not instant. WebLLM and
further latency optimization remain planned.

### Connect the Online Planner

Create `server/.env` using the names in `server/.env.example` and configure:

```dotenv
PLANNER_BASE_URL=https://your-provider.example/v1
PLANNER_MODEL=your-larger-model
PLANNER_API_KEY=your-server-only-key
# Optional, for broader web search instead of only destination background:
BRAVE_SEARCH_API_KEY=your-server-only-search-key
```

The provider must support OpenAI-compatible chat completions, function tools and
JSON-schema responses. Choose a larger model explicitly. Keys stay server-side,
never in `VITE_*`, browser settings or commits. No hosted model calls occur until
you configure and request them.

Run the gateway and frontend in separate terminals:

```bash
npm run dev:planner
npm run dev
```

Vite proxies `/api/planner` to `127.0.0.1:8787`. The gateway loads `server/.env`,
binds to loopback, accepts the configured frontend origin, limits request size and
concurrency, and bounds research to four model rounds/six tools per request.
If the frontend origin/port changes, set `PLANNER_ALLOWED_ORIGIN` accordingly.
This is a **local development gateway**, not a production-authenticated service.
Before exposing publicly, add authentication, authorization and rate/cost controls
behind an HTTPS same-origin deployment proxy. Vite preview is not that deployment.

Research uses Wikipedia destination background snippets, with retrieved source
links/times attached to replies. Optional Brave Search adds broader web snippets.
No automated booking, payments, verified live availability or dedicated weather
feed is implemented. Research can fail; the agent must say so rather than invent it.

Planner responses are schema-validated. A trip-name-only request should ask for
the destination with no change proposal. If a model returns malformed actions,
the gateway permits one correction attempt within its existing round budget;
it never executes or silently accepts invalid actions. A single outer Markdown
JSON fence is tolerated, but incomplete fields or arbitrary embedded JSON are not.
Failed requests include a reference ID and classified code in the network response;
server diagnostics log those identifiers, not chat text, credentials or raw replies.

Online requests send conversation text and a minimized planning context (destination,
dates, currency, group and named stops); they do not attach expense records, private
waypoint notes, structured GPS or images. Prior chat text may itself contain private
details, and is sent as written when you explicitly use the online planner.
Queries also reach research providers. Review what you share when replanning.
Unconfigured/unreachable planner shows an error; local/manual management stays usable.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run dev:planner` | Loopback online planner gateway (server/.env settings) |
| `npm run build` | typecheck + production build + PWA service worker |
| `npm run preview` | serve the built app |
| `npm run typecheck` | TypeScript across all workspaces |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests (one-shot) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run format` | Prettier |

## Project structure

```
trip-polama/
  apps/web/             # Vite + React PWA
  packages/core/        # shared types + pure brain logic (tested, framework-free)
  packages/store/       # Dexie schemas + typed repo
  packages/online-brain/# open-model client + offline fallback
  server/               # Development online planner gateway + research tools
  plans/                # versioned architecture plans
  memory-bank/          # project memory (state, patterns, progress)
  .cursor/rules/        # agent rules
```

## How to test

### Live Model Smoke Test

For the configured online planner (may consume provider usage):

```bash
npm run test:live-planner
```

This loads `server/.env` and tests name-only clarification, complete creation
proposals and synthetic destination research through the
actual planner logic. Normal tests skip it. Model availability in the provider's
listing does not guarantee your account has inference access. HTTP 402 means paid
access/credit is required; the app reports it without retrying or switching agents.
Latest online run: `gemma4:31b` on Ollama Cloud completed Wikipedia-backed research
in about 4.7 seconds. The running gateway also returned HTTP 200 in about 3.5 seconds.
Access worked for the configured account; this does not establish unlimited/free
eligibility for other models or accounts. Broader web search is not configured.

With Ollama running and `llama3.2:3b` installed:

```bash
npm run test:live-model
# Override the server/model if needed:
OLLAMA_HOST=http://localhost:11434 OLLAMA_MODEL=llama3.2:3b npm run test:live-model
```

These opt-in tests use synthetic trip details, call the actual local manager adapter
and validate a summary and an expense proposal. They do not execute
trip mutations or access your browser's stored trips. Normal `npm test` skips them.
The latest live manager run passed both on llama3.2:3b; replies took roughly 22-31
seconds. Earlier constrained tests rejected unrelated extra actions, leading to
the one-action manager policy. This is a smoke test, not a reliability guarantee.
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

The app/package identity is `trip-polama`, with workspace scope `@trip-polama`.
The existing IndexedDB identifier and local preference keys are intentionally
unchanged so the rebrand preserves saved trips, images, conversations and setup.

Current plan: [Plan v5 - Split-Brain Routing](plans/v5-split-brain-routing.md).
Chat history and action statuses persist in IndexedDB. Confirmations use scoped
transactions; duplicate execution and cross-trip waypoint changes are blocked.
Local manager live inference is smoke-tested. Online planner has mocked regression
tests plus live Gemma/Wikipedia research and HTTP gateway checks.
Physical-device tests and account sync remain pending.

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
store, separate local/online chat routes and a bounded research gateway. Local
management does not silently substitute the online planner (or vice versa).
