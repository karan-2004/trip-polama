# View — TrailBrain (architecture)

```
┌────────────────────────── PWA (React + TS, installable) ──────────────────────────┐
│  UI: Trip · Map · Expenses · Photos · People · Plan                                │
│                                                                                    │
│  Local brain                        Online brain                                   │
│  ├ deterministic heuristics         ├ open-model planner (Ollama / Groq /          │
│  └ on-device model (WebLLM)          │   OpenRouter) via serverless proxy          │
│                                                                                    │
│  Local store: Dexie (IndexedDB)     Sync engine: push/pull + merge                 │
│  Offline map: MapLibre + PMTiles                                                   │
│  Live P2P: WebRTC DataChannel (offline) + Supabase Realtime (online)               │
└────────────────────────────────────────────────────────────────────────────────────┘
                │  Supabase (Postgres + Auth + Realtime + RLS)
                │  Worker proxy (open-model calls, key-holding)
```

## Data flow
- All reads/writes go through Dexie first (offline-capable).
- Sync engine pushes local edits out and pulls merges in when a connection appears.
- Online brain is called on-demand for planning; fallback keeps it optional.
