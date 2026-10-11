# Project Brief — trip-polama

Offline-first, split-brain trip planner/manager for outdoor trips, built as a PWA.

**One line:** Get people off the screen and into the world, with open-source AI at the core.

**Scope:**
- Chat is primary: persistent planners for new/exploratory trips, managers for
  existing trips, and confirmed actions alongside the manual screens.
- Local brain (offline, no signal): expenses, offline map, "what next" suggestions, photo log, buddy location tracking.
- Online planner: larger LLM with online research/resource tools for efficient,
  source-backed trip exploration and planning.
- Local manager: lightweight local model for all supported trip data reads/writes,
  summaries and quick responses through chat, alongside the manual tools.
- Full multi-device sync + accounts (Supabase), on-device open model (WebLLM), live P2P buddy tracking (WebRTC).

**Non-goals (for now):** social feed, booking/payments, native background GPS.
