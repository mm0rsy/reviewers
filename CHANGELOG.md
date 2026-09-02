# Changelog

All notable changes to the reviewers plugin. Format follows
[Keep a Changelog](https://keepachangelog.com/); versions follow semver.

## [0.7.0] — 2026-09-03
### Added
- **Baseline**: `- baseline: .reviewers/baseline.md` in review.md's Settings parks specific
  acknowledged-but-unfixed findings, distinct from the decision ledger — a baseline entry
  claims a finding is known debt, not that it's acceptable, and covers only that one instance
  (no bounds enforcement, no coverage of other instances of the same issue). Applied only
  during synthesis; reviewers never see it. Suppressed findings move to a new
  `## Suppressed by baseline` section instead of being dropped; entries with no matching
  finding this iteration are flagged stale for pruning, and `Expires` dates flagged for
  re-triage. Learning loop (full-review Step 10) now distinguishes "that's intentional"
  (ledger) from "known issue, not fixing now" (baseline). New
  `core/reference/baseline.md`; `core/reference/review-schema.md`,
  `core/reference/synthesis.md`, `core/bodies/{full-review,init}.md` updated.

## [0.6.0] — 2026-09-03
### Added
- **Incremental re-review**: synthesis now finds the most recent prior iteration and adds a
  `## Since last review` section classifying each finding as Resolved, Persisting, or New
  (plus a Not re-checked list for prior findings whose file or reviewer wasn't active this
  time) — entries carrying forward also get a `(persisting since NNN)` tag in the fix plan. Matching
  is judgment-based (same reviewer + file + underlying issue; line-number drift is not a
  mismatch) and happens only during synthesis — individual reviewers stay blind to history
  so their judgment isn't anchored by it. Findings settled by the decision ledger are never
  reported as "resolved" — they were withheld, not fixed. `core/reference/synthesis.md`,
  `core/bodies/full-review.md`.

## [0.5.0] — 2026-09-03
### Added
- **PR/MR integration**: findings post as inline PR/MR review comments plus a summary
  comment, on both GitHub and GitLab (`scripts/ci/`, `action.yml`,
  `gitlab/reviewers.gitlab-ci.yml`). Built on `gh`/`glab` rather than hand-rolled HTTP.
  Idempotent — a hidden marker keyed to reviewer+file+line+title skips re-posting findings
  still open on re-runs; the summary comment updates in place instead of stacking.
- **Severity gate**: fails the CI job when findings at or above a configurable threshold
  (`critical` default; `major`/`minor`/`none`) are found — `scripts/ci/severity-gate.mjs`.

## [0.4.1] — 2026-09-02
### Added
- `decisions:` may point at a **directory** (recommended: `.reviewers/decisions/`, one
  `D-NNN-<slug>.md` file per decision) as well as a single file. One-per-file merges cleanly
  across parallel branches and gives each decision its own git history.
- Warning when the configured ledger path is matched by .gitignore (an ignored ledger is
  personal, not team, memory).
- `license`, `homepage`, and `repository` fields in the plugin manifest.

## [0.4.0] — 2026-09-02
### Added
- **Decision ledger**: a committed record of settled review decisions, linked from
  review.md's Settings (`decisions:`). Entries carry Decision, Rationale, Binds, Bounds,
  and Revisit-when. Bound reviewers stop re-raising decided matters within an entry's
  bounds and flag the decided pattern spreading beyond them (citing the entry ID);
  synthesis lists findings settled by decisions and reports met revisit conditions.
- **Learning loop** (full-review step 10, interactive only): rejecting a finding as
  intentional drafts a ledger entry, written after the author confirms. Unattended
  (`--auto`) runs never amend the ledger.
- New reference spec `decision-ledger.md`; `/reviewers:init` now offers the ledger.

## [0.3.1] — 2026-09-02
Initial public release.
### Added
- `review.md` contract: dynamic reviewer roster (per domain or file-type) with globs,
  guideline links enforced verbatim, focus areas, `always`, `severity-floor`, `depth`.
- `/reviewers:full-review [--auto|--staged|<PR>]`: change-set detection, roster
  confirmation, per-reviewer reports under `.reviews/<NNN>/`, cross-domain synthesis
  (conflicts, ripple effects, shared root causes, coverage gaps, once-per-review
  project-level pass) into `review-results.md` with a fix plan grouped by file.
- Scope ladder: findings tagged `function|file|module|domain|project` with configurable
  per-reviewer depth.
- `/reviewers:init`: stack inspection + interview → generated review.md.
- `/reviewers:extend <domain> [--auto]`: build a reviewer for any technology (CAPL, Go,
  Rust, …) with the user, from the annotated meta-template, with verified globs and a
  starter guideline doc.
- Four platforms from one canonical core (`scripts/sync.sh`, CI drift gate): Claude Code,
  GitHub Copilot CLI, openCode, Google Antigravity; installer `scripts/install.sh`.

[0.7.0]: https://github.com/mm0rsy/reviewers/releases/tag/v0.7.0
[0.6.0]: https://github.com/mm0rsy/reviewers/releases/tag/v0.6.0
[0.5.0]: https://github.com/mm0rsy/reviewers/releases/tag/v0.5.0
[0.4.1]: https://github.com/mm0rsy/reviewers/releases/tag/v0.4.1
[0.4.0]: https://github.com/mm0rsy/reviewers/releases/tag/v0.4.0
[0.3.1]: https://github.com/mm0rsy/reviewers/releases/tag/v0.3.1
