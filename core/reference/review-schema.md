# review.md Schema

`review.md` is the team's review contract. It lives at the **repository root** (fallback
location: `.reviewers/review.md`) and is committed to version control so every team member —
and every AI platform — reviews code the same way.

The file is plain markdown, readable by humans and parsed by the orchestrator by convention:
`## Settings` for global options, and one `## Reviewer: <Name>` section per reviewer.

## Global settings — `## Settings`

All settings are optional bullet points of the form `- key: value`.

| Key      | Default     | Meaning                                                                 |
|----------|-------------|-------------------------------------------------------------------------|
| `output` | `.reviews/` | Directory where review iterations are written.                          |
| `base`   | `auto`      | Diff base. `auto` = merge-base with the default branch; or a branch name.|
| `parallel` | `true`    | Allow parallel reviewer dispatch on platforms that support subagents.   |
| `depth`  | `module`    | How far up the scope ladder reviewers climb: `function` < `file` < `module` < `domain`. Higher = more thorough, slower, costlier (e.g. `domain` for release reviews). Project-level review always runs once during synthesis. |
| `decisions` | *(none)* | Path to the team's committed **decision ledger** (settled review decisions; see `decision-ledger.md`). A directory (recommended: `.reviewers/decisions/`, one `D-NNN-<slug>.md` file per decision) or a single file with `## D-NNN` sections. When set, reviewers respect settled decisions within their bounds and enforce their limits outside them. |
| `baseline` | *(none)* | Path to the team's committed **baseline** (acknowledged-but-unfixed findings; see `baseline.md`). A single file with `## B-NNN` sections. Distinct from `decisions`: a baseline parks specific known debt without judging it acceptable, and is applied only during synthesis — reviewers never see it. |

## Reviewer sections — `## Reviewer: <Name>`

Each section defines one reviewer. `<Name>` is the human-readable name; its slug
(lowercase, spaces → `-`) names the reviewer's report file.

| Key          | Required | Meaning |
|--------------|----------|---------|
| `files`      | yes*     | Comma-separated glob patterns. A reviewer is activated when any changed file matches. `*` not required if `always: true`. |
| `guidelines` | no       | Comma-separated paths to team guideline/convention documents, each a file **or a directory** (all `*.md` directly inside it, sorted by name — typical for an ADR folder). Their **content is inlined into the reviewer's prompt** — this is how naming conventions and coding standards are enforced. See *Guideline directories and ADRs* below. |
| `focus`      | no       | Comma-separated focus areas the reviewer must prioritize. |
| `always`     | no       | `true` = reviewer runs on every review regardless of file matching (typical for cross-cutting concerns: security, architecture, validation). |
| `severity-floor` | no   | Minimum severity to report (`info`, `minor`, `major`, `critical`). Default: `info`. |
| `depth`      | no       | Per-reviewer override of the global `depth` setting. |
| `repo-map`   | no       | `true` = inline a structural map of the repository into this reviewer's prompt (see `repo-map.md`). Off by default; worth enabling for reviewers judging layering and dependency direction (Architecture, sometimes Security), pointless for narrow file-level domains. |

Free-form prose inside a reviewer section (outside the bullet list) is passed to the
reviewer verbatim as additional instructions — use it for team-specific lore that doesn't
fit a key.

## Guideline directories and ADRs

A `guidelines` entry naming a directory inlines every `*.md` directly inside it (not
recursively), sorted by filename. This exists mainly for **Architecture Decision Records** —
`docs/adr/`, `docs/architecture/decisions/`, and friends — where the team's architectural
intent lives across many numbered files rather than one document.

Two rules apply when inlining a directory of ADRs:

- **Respect ADR status.** Skip any document whose status marks it as no longer in force —
  `Superseded`, `Deprecated`, `Rejected`, `Obsolete` (matched case-insensitively in a
  `Status:` line, a `## Status` section, or MADR front-matter `status:`). Enforcing a
  superseded ADR makes the reviewer defend architecture the team already abandoned. A
  `Proposed`/`Draft` ADR is not yet binding either: inline it, but tell the reviewer it is
  proposed, so it informs judgment without being cited as a violation. Documents with no
  detectable status are treated as in force — most real ADRs record status only in prose, and
  dropping every unparseable one would quietly gut the guideline set. The cost is that a
  superseded ADR written without a status marker still gets enforced; when that happens, name
  the binding ADRs individually instead of the directory.
- **Watch the volume.** Guideline content is inlined verbatim, so a directory of 60 ADRs is
  60 documents in one prompt. When a directory yields more than ~15 in-force documents, warn
  in the roster table and suggest either naming the specific ADRs that bind this reviewer, or
  splitting the ADRs the review should enforce into their own folder. Never silently truncate
  the set — a half-loaded guideline set enforces a fiction.

ADRs are the team's own architecture documentation and are read **only** here, as guidelines.
They are unrelated to the `decisions` ledger (review memory, written by the learning loop) and
to the `baseline` (known debt). A team may use any combination.

## Example

```markdown
# Review Configuration

## Settings
- output: .reviews/
- base: auto

## Reviewer: Backend
- files: src/api/**, src/services/**, **/*.py
- guidelines: docs/python-style.md, docs/api-conventions.md
- focus: error handling, transaction safety, API contract stability

## Reviewer: Embedded
- files: firmware/**, **/*.c, **/*.h
- guidelines: docs/misra-subset.md
- focus: memory safety, ISR constraints, fixed-point arithmetic

We target a Cortex-M0 with 16KB RAM; treat any heap allocation as a finding.

## Reviewer: Technical Writing
- files: **/*.md, docs/**
- focus: clarity, terminology consistency, audience fit

## Reviewer: Architecture
- always: true
- depth: domain
- repo-map: true
- guidelines: docs/adr/
- focus: cross-module boundaries and layering, dependency direction, API surface evolution

## Reviewer: Security
- always: true
- severity-floor: minor
- focus: injection, secrets, authn/authz, unsafe deserialization
```

## Parsing rules (for the orchestrator)

1. Only `##` headings delimit sections; `#` headings and everything above the first `##` are ignored.
2. Keys are matched case-insensitively; unknown keys are ignored with a warning in the roster table.
3. Glob matching is against repo-relative paths of **changed files** (git pathspec semantics; `**` crosses directories).
4. A guideline path that doesn't exist is reported as a warning in the roster, never a fatal error.
5. If two reviewers share a name slug, suffix the later one with `-2`, `-3`, … for report filenames.
