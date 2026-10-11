# Core Files — TrailBrain

| Path | Description |
|---|---|
| `packages/core/src/types.ts` | Domain types: Trip, Waypoint, Expense, Photo, MemberLocation, enums |
| `packages/core/src/geo.ts` | `haversineKm` great-circle distance |
| `packages/core/src/settle.ts` | `summarizeExpenses`, `computeNetBalances`, `suggestTransfers` |
| `packages/core/src/suggest.ts` | `suggestNext` — offline next-waypoint ranking (weather/daylight/elevation/pace) |
| `packages/store/src/entities.ts` | Row types (add `tripId` to core entities) |
| `packages/store/src/db.ts` | `TrailBrainDB` Dexie schema (5 tables) |
| `packages/store/src/repo.ts` | Typed CRUD: trips, waypoints, expenses, photos, member locations |
| `packages/online-brain/src/planner.ts` | `planTrip` (open-model) + `fallbackPlan` (offline) |
| `apps/web/src/App.tsx` | Minimal app shell (wires `@trailbrain/core`) |
| `apps/web/vite.config.ts` | Vite + React + `vite-plugin-pwa` config |
