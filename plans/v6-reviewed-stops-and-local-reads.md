# trip-polama - Plan v6: Reviewed Stops, Local Reads and Chat Photos

**Version:** v6 | **Date:** 2026-10-11 | **Status:** Approved by user request

## Goal

One persistent conversation per trip. A larger online planner suggests places in
the destination before creation, and the selected sourced places become saved
waypoints. A local manager handles trip records, accurate retrieval and quick
summaries. Read-only operations do not ask for confirmation. Writes use readable
data reviews, never raw JSON. Chat supports multi-image attachments stored locally.

## Decisions

| Area | Decision |
|---|---|
| Home | Chat primary; manual tools and trip list remain accessible |
| Planner | Server-configured larger online LLM with bounded research tools |
| Manager | Local Ollama now; in-browser WebLLM remains planned |
| Destinations | Suggest sourced nearby places before confirming creation |
| Coordinates | Retrieve from place-data sources, never infer with a model |
| Waypoints | Save user-selected stop records atomically with trip creation |
| Reviews | Plain-language labels, dates, amounts, members and stop selection |
| Reads | No approval; execute allowlisted retrieval/calculation/navigation tools |
| Writes | Explicit confirmation, trip scope, audit status and duplicate protection |
| Accuracy | Model selects retrieval intent; local records/calculations supply facts |
| Speed | Short known read commands bypass inference; natural reads use compact selection |
| Chat photos | Multi-select icon, local previews and atomic album/history links |
| Photo privacy | No location tags or model upload; metadata stripping still deferred |
| UI | Light sky-blue/green, no raw coordinates or developer setup details |
| Backend | Supabase auth/sync/RLS and public gateway hardening remain planned |
| Coverage | Maintained matrix, measured baseline and CI reports remain planned |

## Architecture and Stack

```text
Trip chat + manual tools
  Online planner -> research/nearby places -> sourced recommendations
                 -> human-readable trip/stop review -> atomic creation + waypoints
  Local manager  -> known read command -> immediate deterministic result
                 -> natural request -> compact model-selected read -> saved-data result
                 -> mutation proposal -> human-readable review -> confirmed transaction
  Photo gesture  -> multi-select/preview -> local album + chat links, no model request
```

- React/TypeScript/Vite PWA, shared plain CSS tokens and vite-plugin-pwa.
- packages/core: domain schemas, read/write policy, read formatting and calculations.
- packages/store: Dexie records/history, scoped transactions and photo batches.
- packages/online-brain: separate online client and local manager adapter.
- server: Node/tsx loopback development gateway with server-held credentials.
- Planner model: user-configured Ollama Cloud gemma4:31b, not embedded in browser.
- Manager model: local llama3.2:3b; no silent cloud fallback.
- Wikipedia destination and geosearch data; optional Brave broader web search.
- MapLibre/OpenFreeMap online maps; PMTiles downloads remain planned.
- Vitest/jsdom/fake-indexeddb now; Playwright/device tests still required.

## Planner and Trip Creation

1. Explore in a planning chat before a trip exists, preserving history.
2. Ask for missing destination/name/currency; incomplete requests do not create data.
3. Resolve the full destination, then retrieve nearby named places and coordinates
   from source pages. Nearby search currently covers a 10 km straight-line radius.
4. Exclude missing/invalid coordinates and obvious administrative constituencies.
   Background place references do not establish safe access, routes or opening hours.
5. Show place names, descriptions and source links. The review lets the user
   uncheck stops before confirming. Do not display raw coordinate values.
6. Model proposals carry only source-reference IDs, not invented geometry. Match
   selections against the conversation's validated spot records.
7. Commit trip, selected waypoints, conversation handoff and action status together.
   Unknown/duplicate references fail with rollback. Reconfirmation cannot duplicate.
8. If place lookup fails, explain the limitation and retain manual map selection;
   never fill in dummy coordinates or silently fabricate stops.
9. Existing trips default to local management; explicit Research/Replan switches
   to online planning in the same history. Endpoint configuration remains separate.

## Read-Only Manager Behavior

- Supported data reads: summary, expenses/balances, waypoints, members, photo count
  and check-ins, with optional record-name filtering.
- Use complete local records, including expenses older than the recent model snapshot.
- Exact short commands execute deterministically without an inference request.
- Clear natural retrieval requests constrain the local model to selecting a read
  section/query. Ignore generated factual prose; format the answer from actual data.
- Use a small context/output budget for selection rather than full trip reasoning.
- Retrieval, next-stop calculation and opening manual views require no approval.
  Browser location permission is separate and still required for GPS calculations.
- Automatic execution must reject mutation types. Reads never update trip data;
  conversation results/audit history may be persisted.
- Ambiguous mixed read/write requests stay in the mutation approval path. The
  manager currently proposes at most one operation per reply.
- After mutations, the next read uses fresh records. Full multi-step tool follow-up
  and broader local intent coverage remain future work, not claimed complete.

## Human-Readable Reviews

- Present labels and actual values, not JSON, schema keys or source IDs.
- Trip review includes destination, dates, currency, members and selected stops.
- Expense review includes amount, payer, participants and category.
- Updates show only changed fields; visited/check-in reviews name the relevant
  stop/member and explain that GPS uses this device.
- Confirm/dismiss controls belong to writes. Read failure can offer Retry, not approval.
- Approval is tied to the stored proposal and submitted stop selection; stale or
  already applied proposals cannot execute again.

## Chat Photo Attachments

- Accessible image icon opens a multiple-image picker for a created trip.
- Preview/remove selections before saving, with optional shared note.
- Limit to ten images, 10 MB each and 50 MB total per batch; reject invalid selections.
- Save image Blobs, album records and chat photo links atomically, without a model call.
- Direct user Save is the write gesture, equivalent to the manual photo flow.
- Do not attach GPS/place labels, send image bytes to online/local models, or infer
  image contents. EXIF/GPS inside originals is not stripped yet.
- Physical camera and browser-storage quota/eviction tests remain pending.

## Deferred Photo Metadata Privacy

Implement offline removal of location-bearing EXIF/XMP/IPTC in supported JPEG/PNG
imports later. Preserve orientation/appearance/quality and verify fixtures before
claiming images are location-free. Handle unsupported/corrupt files explicitly.
Legacy cleanup and export/sharing policy require a separate decision; never silently
overwrite existing images. Until then, originals may contain embedded GPS metadata.

## Testing and Coverage

- Test readable reviews, selected/unknown spot IDs, creation rollback and duplicates.
- Test complete-data summaries, old expense retrieval, exact balances, remaining
  stops, auto-read execution and automatic-write rejection.
- Test photo batch limits, local Blob persistence, album/chat linkage and no model calls.
- Expand opt-in live local tests for summary, retrieval, lists, write proposals and latency.
  Use synthetic fixtures and never execute live-test mutations against user trips.
- Live-test planner clarification, sourced spots/creation and research separately.
- Record failures honestly: model hallucinations and overly large read prompts
  prompted deterministic read results and compact tool selection.
- Planned docs/testing.md maps features to unit/component/storage/browser/live tests.
- Planned Vitest reports include all first-party executable source and statements,
  branches, functions and lines. Record baseline/exclusions before agreeing thresholds.
- Publish coverage CI artifacts later; test counts are not coverage percentages.
- Distinguish mocked hardware/network/storage from real device, quota and offline E2E.

## Roadmap and Limits

| Stage | Deliverable | Acceptance |
|---|---|---|
| Current iteration | Sourced stops, readable approvals, automatic reads, chat photos | Scoped storage and UI regressions; live smoke checks |
| Test visibility | Coverage matrix/baseline/CI reports | Reproducible metrics and explicit gaps |
| Manager reliability | Broader retrieval/intent tests and latency tuning | Grounded facts; no unapproved writes |
| Planner research | More source quality/current-resource adapters | Provenance and honest freshness limits |
| Group support | Supabase auth/sync/RLS and WebRTC | Secure coordination; browser limits explicit |
| Offline maps/inference | PMTiles regions and WebLLM evaluation | Device-tested offline behavior |
| Photo privacy | Verified metadata sanitizer | Fixture-proven GPS removal |
| Release quality | Authenticated deployment/device/offline E2E | Secure and reliable user flows |

The gateway is loopback development-only, not ready for public exposure. Credentials
stay server-side, network/usage failures never switch agents automatically, and
resource snippets are untrusted data. MCP remains an optional adapter for external
agents after shared commands/auth/sync, not a dependency of built-in chat.
