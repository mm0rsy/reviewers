# Changelog

All notable changes to the reviewers plugin. Format follows
[Keep a Changelog](https://keepachangelog.com/); versions follow semver.

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

[0.4.1]: https://github.com/mm0rsy/reviewers/releases/tag/v0.4.1
[0.4.0]: https://github.com/mm0rsy/reviewers/releases/tag/v0.4.0
[0.3.1]: https://github.com/mm0rsy/reviewers/releases/tag/v0.3.1
