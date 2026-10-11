# Active Context — TrailBrain

**Current focus:** Phase 2 — spike WebLLM on-device model for the local brain.

**State:** Phase 0–1 is complete and verified (typecheck/lint/test/build all green).
The monorepo, PWA shell, core brain logic, Dexie store, and online-brain planner exist.

**Next steps (in order):**
1. Spike (Phase 2): run a small open model on-device via WebLLM for local suggestions.
   - Deterministic `suggestNext` fallback already exists, so the spike is low-risk.
   - Verify suggestions work with and without WebGPU.
2. Spike (Phase 3): WebRTC manual-signal P2P for offline buddy tracking.
3. Phase 4: Supabase auth + sync engine + RLS.
4. Phase 5: local brain UI features (expenses, map, suggestions, photos, check-ins).
5. Phase 6: online brain UI (planning) + proxy.
6. Phase 7: PWA polish + E2E offline tests + Lighthouse.

**Blocked by:** nothing.

**Last updated:** 2026-10-11
