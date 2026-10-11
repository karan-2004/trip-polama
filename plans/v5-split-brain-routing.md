# trip-polama - Plan v5: Online Planner and Local Manager

**Version:** v5 | **Date:** 2026-10-11 | **Status:** Approved by user clarification

## Goal

One persistent chat per trip, with two distinct agents and model routes. A larger
online LLM researches and plans trips using online resources. A lightweight local
agent manages trip data through chat, gives summaries and performs quick reads
and confirmed writes. Manual screens use the same data and remain accessible.
The project remains a no-rush full build.

## Decisions

| Area | Decision |
|---|---|
| Planner | Larger online LLM plus controlled online resource tools |
| Planner tasks | Exploration, destination research, itinerary/budget/transport options and replanning |
| Manager | Lightweight local model plus local read/write tools |
| Manager tasks | Trip records, expenses, members, stops, summaries and quick responses |
| Home | Chat primary; trips and exploratory conversations alongside it |
| Lifecycle | Explore before creation; confirmed creation activates management |
| Replanning | Existing trips can explicitly request the online planner; no new chat required |
| Tools | Shared domain commands, runtime schemas, trip scope and audit results |
| Writes | Explicit confirmation, transactional application and duplicate protection |
| Reads | Automatic within the authorized trip; no mutation approval required |
| Offline | Local management/manual tools remain independent of the online planner |
| Online failure | Explain unavailability; never impersonate researched planning with a template |
| Privacy | Minimize planner payload; private notes, precise GPS and images stay local by default |
| Backend | Supabase auth/sync/RLS and authenticated planner proxy remain planned |
| UI | Light sky-blue/green palette, no manual/raw coordinate UX |
| Photos | Picker/camera, no geolocation tags; metadata stripping deferred |
| Tests | Maintained test matrix, measured coverage baseline and CI artifacts planned |
| MCP | Optional later adapter for external agents, not required for built-in chat |

## Architecture

```text
Persistent trip conversation + manual screens
                    |
         Explicit role / capability router
          /                         \
Online planner                  Local manager
Large LLM                       Small local model
Search/resource tools           Local reads + calculations
Source-backed plan              Typed mutation proposals
          \                         /
             Shared domain tool layer
       validation -> scoped confirmation -> transaction
                 -> local result / audit
                 -> agent response and UI refresh
```

## Agent Responsibilities

### Online Planner

- Use the larger model for deeper reasoning and efficient multi-step research.
- Online resource access comes from tools, not merely from selecting a large LLM.
- Integrate search/place discovery, relevant weather, transport and destination
  information through controlled adapters. Providers/model remain undecided.
- Explain recommendations with source URLs, retrieval times, uncertainty and
  freshness. Identify conflicting or missing information rather than inventing it.
- Treat retrieved pages as untrusted data; instructions inside pages cannot
  change tool permissions or write policy.
- Propose a structured trip/itinerary for approval; no autonomous booking,
  payment, message sending or publishing.
- Send only necessary planning constraints to the online model. Show the user
  which endpoint receives them. Keys stay behind an authenticated server proxy.
- Cache approved plans and source summaries locally for use on the trip.

### Local Manager

- Manage all supported trip data through chat: details, members, expenses,
  waypoints, visits, notes and device check-ins, plus local summaries/calculations.
- Provide quick, concise responses using a compact model and selective local tools.
- Prefer deterministic arithmetic/settlement/ranking over asking the LLM to compute.
- Retrieve the current relevant records, including manual edits; do not resend
  full history and all records unnecessarily.
- Route image upload/camera and map selection to their interactive UI; never
  fabricate media or coordinates. Photos remain location-free.
- No hidden dependency on an online LLM for normal management. Online escalation
  requires explicit user intent/permission and visible mode change.
- Local Ollama is the current development adapter, not proof of on-phone offline
  operation. Browser WebLLM/device deployment must be evaluated separately.
- The observed llama3.2:3b latency of 30-47 seconds is not yet the desired quick
  manager experience. Measure latency before claiming it meets the product goal.

## Routing and Handoff

1. New/exploratory chats default to the online planner; internet/model unavailable
   states are explicit, while manual creation remains available.
2. Confirmed creation retains the conversation and hands the approved structured
   plan to the local manager. Store the active role/model provenance with messages.
3. Existing trips default to the local manager. Offer an explicit Research/Replan
   path back to the online planner without losing management history.
4. Keep planner and manager endpoint/model configuration separate. Role selection
   must choose different capability sets, not just different system prompts.
5. After a tool executes, return its structured result to the active agent so it
   can explain completion. Bound step counts, timeouts, retries and cancellation.
6. Read-only tools can execute automatically; writes remain pending until approved.
   Centralize validation/domain rules for both manual and agent paths.

## Stack and Structure

- React/TypeScript/Vite PWA, plain CSS nature tokens and vite-plugin-pwa.
- apps/web: chat router/UI, manual screens, device interaction and model status.
- packages/core: domain contracts, Zod tool schemas and deterministic calculations.
- packages/store: Dexie local repositories, history and scoped action transactions.
- packages/online-brain: online planning/model/resource adapters; current Ollama
  adapter to be separated/reused for the manager, not mistaken for the planner.
- server: authenticated online-model/resource gateway with server-held keys.
- MapLibre/OpenFreeMap online maps now; PMTiles downloads planned.
- Supabase auth/sync, WebLLM and WebRTC remain planned integrations.
- Vitest/jsdom/fake-indexeddb now; browser/device/Playwright checks remain needed.
- MCP can later wrap the shared tool layer for external assistants. A standalone
  MCP server cannot directly access browser IndexedDB without sync or a paired bridge.

## Privacy and Deferred Photo Work

- Photos never request device location or attach/display app location tags.
- Original uploaded bytes may still contain GPS/location EXIF/XMP/IPTC metadata.
- Later sanitize supported imports offline before persistence; evaluate JPEG/PNG,
  preserve orientation/appearance/quality and verify sanitized output.
- Do not claim stripping succeeded for unsupported/corrupt files. No silent
  legacy-image replacement; decide migration/export policy separately.
- Verify GPS-bearing, clean, corrupt and rotated-phone-photo fixtures before
  adding export/sharing that promises location-free images.
- Online map/resource requests disclose relevant areas/queries to providers;
  retain attribution, permission and clear network boundaries.

## Test Visibility and Acceptance

- Create docs/testing.md with feature-to-test references, levels, commands and gaps.
- Configure Vitest coverage over executable first-party TS/TSX, including untested
  files; explicitly exclude tests/declarations/generated/config-only files.
- Report statements, branches, functions and lines in terminal/HTML/LCOV. Record
  baseline date/revision, then agree thresholds before enforcing them.
- Publish CI coverage artifacts; generated reports stay out of Git. Maintain docs
  alongside iterations. Test counts are not coverage percentages.
- Test role routing, existing-trip replanning and handoff without chat/data loss.
- Test local management with online planner disabled, and no silent cloud escalation.
- Test source provenance, stale/conflicting results and malicious retrieved content.
- Test reads/writes, confirmation/isolation, concurrency, rollback and tool-loop limits.
- Benchmark local summary/read/write latency and planner research latency separately.
- Keep mocked hardware/WebGL and fake-indexeddb limitations visible. Physical GPS,
  camera, real tiles, live agents, quotas and browser offline E2E need separate checks.

## Roadmap

| Stage | Deliverable | Acceptance |
|---|---|---|
| Foundation | Existing local data, chat and manual tools | Persistence and regressions green |
| Test visibility | Matrix, coverage baseline and CI reports | Reproducible metrics and explicit gaps |
| Shared tools | Unified domain commands and bounded result-return loop | Read/write parity, scope and cancellation |
| Split routing | Separate planner/manager config and role provenance | Correct route, handoff and explicit replanning |
| Local manager | Selective retrieval, summaries and local inference | Offline management; measured quick responses |
| Online planner | Larger LLM, resource tools and secure gateway | Source-backed plans; keys and permissions protected |
| Group support | Auth/sync/RLS and WebRTC | Secure coordination with browser limits explicit |
| Offline maps | PMTiles/download/cache management | Downloaded regions work offline |
| Photo privacy | Deferred metadata sanitizer | Verified fixtures; honest unsupported states |
| Release quality | Device/installation/offline E2E | Both agents and manual workflows verified |

## Current State Versus Target

Current code uses one Ollama endpoint/model for both prompt roles and has no online
research tools. Three synthetic live tests passed with llama3.2:3b; 50 regression
tests pass, but measured coverage is not configured. Separate routing, an online
planner provider/resource tools, the complete result-return loop and quick offline
manager inference remain implementation work. No provider/model selection or
runtime implementation change is made by this architecture clarification.
