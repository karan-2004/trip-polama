# trip-polama - Plan v3: Chat-First Workspace

**Version:** v3 | **Date:** 2026-10-11 | **Status:** Approved by user request

## Goal

The heart of trip-polama is a persistent conversation per trip. New/exploratory
conversations are planners; created trips have managers. Manual tools remain
available and share the same local data. The timeline remains a no-rush build.

## Decisions

| Area | Decision |
|---|---|
| Home | Chat-first workspace with trips and exploratory sessions alongside it |
| Planner | Chat can exist before a trip; creation needs confirmation |
| Manager | Same chat survives creation; loads fresh state for each response |
| Actions | Strict, allowlisted proposals, explicitly confirmed or dismissed |
| Scope | Only the selected session's linked trip; no model-supplied trip IDs |
| Manual use | Maps, expenses, suggestions, people and photos stay accessible |
| Persistence | Dexie sessions/messages; atomic mutation, status and audit result |
| Model | Configurable Ollama adapter now; browser WebLLM remains planned |
| Backend | Supabase auth, sync and RLS remain planned |
| Styling | Light sky-blue/green CSS-token palette |
| Location | Device/map selection only; no coordinate entry or display |
| Photos | Picker and real camera; no photo geolocation/tagging |
| Privacy | Embedded photo location-metadata stripping deferred |

## Architecture

```text
Home: trips + exploration | planner/manager conversation
                      -> fresh local context
                      -> selected open-model endpoint
                      -> strict response/action validation
                      -> pending proposal: confirm / dismiss
                      -> scoped local transaction + audit status
                      -> refreshed chat and the same manual screens
```

## Stack and Structure

- Vite, React, TypeScript, vite-plugin-pwa and plain CSS nature tokens.
- `apps/web`: chat home, manual tools, camera/GPS/maps and model settings.
- `packages/core`: domain types, Zod action schemas, settlement and suggestions.
- `packages/store`: Dexie repositories and confirmed-action executor.
- `packages/online-brain`: Ollama chat plus existing planner adapter.
- `server`: future authenticated model proxy; no embedded browser service keys.
- MapLibre/OpenFreeMap maps online now; offline PMTiles downloads planned.
- Supabase auth/sync, WebLLM and WebRTC remain planned integrations.
- Vitest/jsdom/fake-indexeddb now; browser/device/Playwright tests still needed.

## Chat Lifecycle and Tools

1. Start a planning chat and retain its history without creating a trip.
2. Ask for missing details or propose `create_trip`; no mutation until confirmation.
3. Link the confirmed trip to that conversation, transitioning to manager mode.
4. Find or create a single conversation when selecting an existing trip.
5. Load fresh state, including manual edits, before every model request.
6. Validate a reply and typed proposals, never arbitrary code or executable text.
7. Tools: create/update trip, add member/expense, save a waypoint here, mark a stop
   visited, check in at this device, calculate next stops, and open manual views.
8. Photos/camera and remote waypoint selection use explicit device/map interaction;
   the model cannot fabricate media or destination coordinates.
9. Commit mutations and proposal status atomically; reject duplicate confirmations
   and cross-trip waypoint IDs. Dismissal stays in history without execution.
10. Show local audit results separately from unexecuted model proposals.

## Boundaries and Privacy

- Network availability is not model readiness. No simulated replies on errors.
- Ollama is a separate service, not in-browser WebLLM.
- Structured coordinates, images and photo filenames are excluded from model
  context. User message text is transmitted as written.
- Remote endpoints receive conversation/trip data; selection is explicit.
- No browsing, booking, weather API or autonomous sharing tool exists yet.
- Check-ins record this device, not another person's remote/live position.
- Local history/manual features survive offline; replies need a reachable model.
- Maps currently fetch tiles online and are not verified walking routes.

## Deferred Photo Location-Metadata Stripping

Photo UI does not collect location, but uploaded bytes may still contain it.
Stripping is not implemented in this iteration.

- Later sanitize imports locally before persistence for supported formats.
- Remove GPS/location EXIF and location-bearing XMP/IPTC fields.
- Evaluate JPEG/PNG first; preserve orientation, appearance and quality.
- Verify output before claiming location-free; unsupported files/failures must
  receive explicit feedback, not silent success.
- Require sanitization before future export/sharing. Decide legacy cleanup
  separately; do not silently overwrite existing images.
- Test GPS-bearing, clean, corrupt and rotated-phone-photo fixtures.

## Roadmap

| Stage | Deliverable | Acceptance |
|---|---|---|
| Foundation | Local store, deterministic tools, manual UI | Persistence and tests/build green |
| Chat-first core | Planner/manager sessions and confirmed tools | Transition, isolation, persistence and manual parity |
| Model reliability | Live Ollama tests then WebLLM spike | Honest status and GPU/fallback behavior |
| Group support | WebRTC and Supabase auth/sync/RLS | Secure sync; foreground limits explicit |
| Offline maps | PMTiles downloads/cache management | Downloaded regions work offline |
| Online planning | Verified resource tools and model proxy | Provenance, permissions and key boundaries |
| Photo privacy | Deferred metadata sanitizer | Verified fixtures, no false privacy promises |
| Release quality | Installation, device and offline E2E | Permission/camera/map/chat/reload flows tested |

## Current State

The chat shell, persistence, scoped executor and Ollama adapter exist. No model
was installed/downloaded automatically. Live inference, device testing, auth/sync,
WebLLM and offline maps remain pending. New tools require schema, executor, UI
and regression tests together; prompt instructions alone are not security.
