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

## Files

- [v1-initial-architecture.md](v1-initial-architecture.md) — current plan
