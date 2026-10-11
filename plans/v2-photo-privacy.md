# TrailBrain - Plan v2: Photo Privacy

**Version:** v2 | **Date:** 2026-10-11 | **Status:** Approved by user request

## Goal

Build an offline-first outdoor trip planner/manager as a PWA, with a local brain
for on-trip operations and open-model planning when connectivity is available.
Photos must not request or attach device location. Image location-metadata
stripping is planned for a later iteration, not implemented in this version.

## Decisions

| Decision | Choice |
|---|---|
| Timeline | No-rush full build; no challenge deadline driving scope |
| Platform | React + TypeScript PWA |
| Backend | Supabase Auth, Postgres, Realtime and RLS |
| Sync | Multi-device sync and accounts in first product release |
| On-device AI | WebLLM, with deterministic fallback |
| Buddy tracking | WebRTC P2P plus online Realtime; foreground browser limits explicit |
| Styling | Light sky-blue/green nature palette; current UI uses plain CSS tokens |
| Location UX | Device geolocation only, no manual coordinates; display place names |
| Photo input | Image picker plus actual camera preview/capture; no filename entry |
| Photo location | No geolocation permission requests, controls, tags or location labels |
| Photo privacy | Strip embedded location metadata in a deferred implementation |

## Stack

- Vite, React, TypeScript and vite-plugin-pwa.
- IndexedDB through Dexie for local data and image Blobs.
- MapLibre GL and PMTiles for planned offline maps.
- Plain CSS with shared tokens and repository design rules.
- Vitest with jsdom/fake-indexeddb for component/storage tests; Playwright planned.
- Supabase for planned auth, sync and presence; serverless proxy for model calls.
- WebLLM for planned on-device inference; Ollama/OpenAI-compatible planner adapter.
- WebRTC for planned peer-to-peer transport.

## Structure

```text
trailbrain/
  apps/web/               React PWA and device integrations
  packages/core/          Domain types and deterministic logic
  packages/store/         Dexie schemas and repository APIs
  packages/online-brain/  Model planner and offline fallback
  server/                Planned model proxy
  plans/                 Immutable plan versions and index
  memory-bank/           Current project state
  .cursor/rules/         Persistent design and workflow rules
```

## Component Design

1. Local brain: expense settlement, waypoint ranking, photos, check-ins and maps.
2. Local store: trip records and child entities, image Blobs, future sync metadata.
3. Online brain: itinerary/packing/budget planning with explicit offline fallback.
4. Sync: push/pull local edits; conflict rules and RLS verified before multi-user use.
5. Buddy tracking: online presence and manual-signaled WebRTC; no promise of
   background GPS or connectivity-independent discovery.
6. Photos: local image picker/camera, preview, notes and timestamps. New records
   omit lat/lon/placeName. Existing records are preserved but location is hidden.

## Deferred Photo Location-Metadata Stripping

**Status: planned only. Original uploaded image bytes are currently unchanged.**

- Implement offline sanitization before persisting newly imported photos.
- Remove GPS/location fields from EXIF and location-bearing XMP/IPTC where present.
- Establish supported formats first; JPEG and PNG are the initial candidates.
- Preserve orientation, image appearance and image quality wherever possible.
- Do not label an image "location removed" without verifying the sanitized result.
- Unsupported formats or sanitization failures must have explicit feedback, not
  silent success or a false privacy guarantee.
- Decide legacy-photo cleanup behavior separately; do not silently overwrite images.
- Before future export/sharing, require a verified sanitization path.
- Test fixtures with embedded GPS and location-bearing metadata, clean images,
  corrupt files and rotated phone photos. Assert metadata removal and usable output.
- No metadata library or stripping implementation is selected in this iteration.

## Roadmap

| Phase | Deliverable | Exit Criteria |
|---|---|---|
| 0-1 | Monorepo, PWA shell, core and store | Types/lint/tests/build green |
| 2 | On-device model spike | GPU and non-GPU behavior verified |
| 3 | WebRTC P2P spike | Two devices exchange positions; cleanup verified |
| 4 | Auth, sync and RLS | Offline edits reconcile securely across users |
| 5 | Local features and offline maps | Usable without network; data survives reload |
| 6 | Planner UI and model proxy | Clear model/fallback status and protected keys |
| 7 | Photo location-metadata sanitization (deferred) | GPS/location fixtures sanitized and verified |
| 8 | PWA/device polish and offline E2E | Installation, permissions and offline flows tested |

## Risks and Verification

- WebGPU/model size: progressive download and deterministic fallback.
- P2P/signaling and browser background limits: foreground scope and device tests.
- GPS versus reverse geocoding: separate capabilities; place lookup is optional
  and never runs from Photos.
- Photo privacy: removing app tags does not remove embedded metadata. Until the
  deferred sanitizer exists, make no claim that uploaded files are GPS-free.
- Unit/component tests cover input validation, camera lifecycle and photo storage;
  physical camera/GPS tests and full offline E2E remain pending.

## Current Execution State

The scaffold and first local UI slice exist. Camera uses getUserMedia rather than
the unreliable capture hint. This iteration removes Photos location options and
adds the deferred privacy work; it does not start model, sync or metadata work.
