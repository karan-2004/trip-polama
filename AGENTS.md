# AGENTS.md — TrailBrain

Project instructions for AI agents (and humans) working in this repo.

## Always do first
Read the memory bank before making changes:
- `memory-bank/projectbrief.md`, `productContext.md`, `activeContext.md`,
  `systemPatterns.md`, `techContext.md`, `progress.md`, `view.md`, `coreFiles.md`.

The memory bank is the source of truth for project state. Update the relevant
files after significant changes (see `.cursor/rules/memory-bank.mdc`).

## Plans
Architecture decisions live in `plans/`, versioned as `v<N>-<slug>.md`. Never
overwrite an old version — add a new one and log it in `plans/README.md`.
Current plan: `plans/v1-initial-architecture.md`.

## Conventions (installed in `.cursor/rules/`)
- **Plan/Act modes** (`core.mdc`): plan first, act only after approval.
- **Atomic tasks** (`atomic-task-planning.mdc`): break work into the smallest steps, execute one at a time.
- **Minimal changes** (`minimal-changes-policy.mdc`): do only what's asked.
- **TDD** (`test-driven-development.mdc`): tests before implementation.
- **Core files doc** (`core-files-documentation.mdc`): keep `memory-bank/coreFiles.md` current.

## Commands
```bash
npm run dev         # run web app
npm run build       # production build
npm run typecheck   # tsc --noEmit (workspaces)
npm run lint        # eslint
npm test            # vitest run
npm run e2e         # playwright
```

## Stack
PWA (Vite + React + TS) · Dexie/IndexedDB · MapLibre + PMTiles · Tailwind ·
Supabase (Auth/Postgres/Realtime) · open-weight models (Ollama/Groq/OpenRouter/WebLLM) ·
WebRTC P2P. See `memory-bank/techContext.md` for details.
