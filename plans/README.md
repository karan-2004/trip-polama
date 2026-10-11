# Plans

All plan versions are retained. The application-wide `trip-polama` rebrand updates
their cosmetic product-name references without changing historical decisions.

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
| v5 | 2026-10-11 | Separate larger online research planner from quick local read/write manager | Approved by user clarification |
| v6 | 2026-10-11 | Reviewed destination stops/waypoints, readable confirmations, automatic reads and multi-photo chat | Approved by user request |

## Files

- [v6-reviewed-stops-and-local-reads.md](v6-reviewed-stops-and-local-reads.md) - current plan
- [v5-split-brain-routing.md](v5-split-brain-routing.md) - historical plan, unchanged
- [v4-test-coverage.md](v4-test-coverage.md) - historical plan, unchanged
- [v3-chat-first-workspace.md](v3-chat-first-workspace.md) - historical plan, unchanged
- [v2-photo-privacy.md](v2-photo-privacy.md) - historical plan, unchanged
- [v1-initial-architecture.md](v1-initial-architecture.md) - historical plan, unchanged
