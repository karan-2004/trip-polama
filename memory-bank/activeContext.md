# Active Context — TrailBrain

**Current focus:** Phase 0–1 — repo scaffold, PWA shell, data model, Dexie store, CI.

**What's happening right now:**
- Project governance is being set up (plans/, .cursor/rules/, memory-bank/).
- No source code exists yet — the repo is a fresh git repo with only docs/rules.

**Next steps (in order):**
1. Finish governance: AGENTS.md.
2. Scaffold npm-workspaces monorepo (apps/web, packages/core, packages/store, packages/online-brain, server).
3. `apps/web`: Vite + React + TS + `vite-plugin-pwa`.
4. `packages/core`: types + pure brain logic (settle, haversine/suggest) + Vitest tests.
5. `packages/store`: Dexie schemas + typed API.
6. Root ESLint/Prettier/tsconfig + CI.
7. Verify typecheck/lint/test green.

**Blocked by:** nothing.

**Last updated:** 2026-10-11
