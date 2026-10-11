# Plans

Every plan lives here, versioned. When the plan changes, **never overwrite an
old version** — write a new `vN-<slug>.md` and log it in the changelog below.
The highest version is always the source of truth; older versions stay for
history and diffs.

## Versioning convention

- Filename: `v<N>-<short-slug>.md` (e.g. `v1-initial-architecture.md`).
- `<N>` is a monotonically increasing integer (start at 1).
- A plan is **approved** only when a "Decisions" section is present and the
  user has signed off in the changelog.
- One plan change = one new version file. Keep each file self-contained (no
  "see v1 for the rest").

## Changelog

| Version | Date | Summary | Status |
|---|---|---|---|
| v1 | 2026-10-11 | Initial architecture: split-brain PWA, full stack, phased roadmap | Approved |
| v2 | 2026-10-11 | Remove photo location options; defer embedded location-metadata stripping | Approved by user request |
| v3 | 2026-10-11 | Chat-first home, planner/manager sessions and confirmed trip actions | Approved by user request |
| v4 | 2026-10-11 | Plan maintained test matrix, measured coverage, baseline review and CI reports | Approved by user request |

## Files

- [v4-test-coverage.md](v4-test-coverage.md) - current plan
- [v3-chat-first-workspace.md](v3-chat-first-workspace.md) - historical plan, unchanged
- [v2-photo-privacy.md](v2-photo-privacy.md) - historical plan, unchanged
- [v1-initial-architecture.md](v1-initial-architecture.md) - historical plan, unchanged
