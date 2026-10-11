# AGENTS.md — trip-polama

Project instructions for AI agents (and humans) working in this repo.

App name: `trip-polama`; package scope: `@trip-polama`; database class: `TripPolamaDB`.
Legacy persisted storage IDs are compatibility identifiers, not branding. Preserve
them unless implementing an explicit tested data migration.

## Always do first
Read the memory bank before making changes:
- `memory-bank/projectbrief.md`, `productContext.md`, `activeContext.md`,
  `systemPatterns.md`, `techContext.md`, `progress.md`, `view.md`, `coreFiles.md`.

The memory bank is the source of truth for project state. Update the relevant
files after significant changes (see `.cursor/rules/memory-bank.mdc`).

## Plans
Architecture decisions live in `plans/`, versioned as `v<N>-<slug>.md`. Never
overwrite an old version — add a new one and log it in `plans/README.md`.
Current plan on deployment branch: `plans/v7-render-deployment.md`.
Production deployment instructions: `docs/render-deployment.md`. Keep planner
calls authenticated and bounded; never disable fail-closed checks to make a deploy pass.

## Chat-First Product
Home conversations are primary. Use planner mode before a trip exists and manager
mode after creation. Manual tools share the same store. Follow `.cursor/rules/chat.mdc`:
validate proposals and require confirmation. Never imply an unreachable model works.
Planner means a larger online LLM with resource-access tools. Manager means a
lightweight local agent for trip reads/writes, summaries and quick responses.
Do not substitute one shared model with two prompts for the target architecture.
Before creation, suggest sourced destination stops and save reviewed selections
as waypoints. Confirm writes using readable values, never JSON. Reads need no
approval; ground retrieval/summaries in saved records. Chat images stay local.

## README
Location UX: follow `.cursor/rules/location.mdc`. Never request manual coordinates.

`README.md` is versioned with the project: update it alongside each iteration
(scripts, structure, and status change as the build evolves).

## Conventions (installed in `.cursor/rules/`)
- **Plan/Act modes** (`core.mdc`): plan first, act only after approval.
- **Atomic tasks** (`atomic-task-planning.mdc`): break work into the smallest steps, execute one at a time.
- **Minimal changes** (`minimal-changes-policy.mdc`): do only what's asked.
- **TDD** (`test-driven-development.mdc`): tests before implementation.
- **Core files doc** (`core-files-documentation.mdc`): keep `memory-bank/coreFiles.md` current.
- **Design system** (`design.mdc`): light theme only, nature palette (sky blue + green). Use CSS tokens in `apps/web/src/styles.css`; never hard-code colors.

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
