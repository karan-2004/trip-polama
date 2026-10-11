# Core Files — TrailBrain

| Path | Description |
|---|---|
| `packages/online-brain/src/chat.live.test.ts` | Opt-in real Ollama smoke tests with synthetic data, no mutations |
| `apps/web/src/components/ChatHub.tsx` | Home workspace: trip chats and exploratory sessions |
| `apps/web/src/components/TripChat.tsx` | Persistent chat, model settings, action confirmation and manual tool navigation |
| `packages/core/src/chat.ts` | Zod tool/reply contracts, chat types and action descriptions |
| `packages/store/src/chat.ts` | Scoped sessions/history and atomic confirmed-action execution |
| `packages/online-brain/src/chat.ts` | Ollama chat adapter with planner/manager context and validated output |
| `apps/web/src/components/TripMap.tsx` | Interactive MapLibre: map selection, named pins, current location and focused suggestion |
| `apps/web/src/components/CameraCapture.tsx` | Live device-camera preview, JPEG capture and stream cleanup |
| `apps/web/src/components/PhotoPreview.tsx` | Local image preview with object URL cleanup |
| `apps/web/src/components/photoInput.ts` | Image MIME and 10 MB size validation |
| `apps/web/src/hooks/placeName.ts` | Current-device reverse geocoding + locality label formatting |
| `apps/web/src/hooks/useLocation.ts` | Permission-aware GPS capture + opt-in place-name lookup |
| `packages/core/src/types.ts` | Domain types: Trip, Waypoint, Expense, Photo, MemberLocation, enums |
| `packages/core/src/geo.ts` | `haversineKm` great-circle distance |
| `packages/core/src/settle.ts` | `summarizeExpenses`, `computeNetBalances`, `suggestTransfers` |
| `packages/core/src/suggest.ts` | `suggestNext` — offline next-waypoint ranking (weather/daylight/elevation/pace) |
| `packages/store/src/entities.ts` | Row types (add `tripId` to core entities) |
| `packages/store/src/db.ts` | `TrailBrainDB` Dexie schema (5 tables) |
| `packages/store/src/repo.ts` | Typed CRUD + `getTripFull` + `setWaypointVisited` |
| `packages/online-brain/src/planner.ts` | `planTrip` (open-model) + `fallbackPlan` (offline) |
| `apps/web/src/App.tsx` | Shell: offline + split-brain indicators, view routing |
| `apps/web/src/components/TripList.tsx` | Trip list + create form |
| `apps/web/src/components/TripDetail.tsx` | Trip detail tabs |
| `apps/web/src/components/Waypoints.tsx` | Waypoint add/list/visited |
| `apps/web/src/components/Expenses.tsx` | Expense add/list + settlement |
| `apps/web/src/components/Suggest.tsx` | Offline "next up" suggestions |
| `apps/web/src/components/People.tsx` | Member check-ins + separation |
| `apps/web/src/components/Photos.tsx` | Photo log |
| `apps/web/src/styles.css` | Single stylesheet (plain CSS) |
