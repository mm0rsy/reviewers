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

## Reviewer sections — `## Reviewer: <Name>`

Each section defines one reviewer. `<Name>` is the human-readable name; its slug
(lowercase, spaces → `-`) names the reviewer's report file.

| Key          | Required | Meaning |
|--------------|----------|---------|
| `files`      | yes*     | Comma-separated glob patterns. A reviewer is activated when any changed file matches. `*` not required if `always: true`. |
| `guidelines` | no       | Comma-separated paths to team guideline/convention documents. Their **content is inlined into the reviewer's prompt** — this is how naming conventions and coding standards are enforced. |
| `focus`      | no       | Comma-separated focus areas the reviewer must prioritize. |
| `always`     | no       | `true` = reviewer runs on every review regardless of file matching (typical for cross-cutting concerns: security, architecture, validation). |
| `severity-floor` | no   | Minimum severity to report (`info`, `minor`, `major`, `critical`). Default: `info`. |
| `depth`      | no       | Per-reviewer override of the global `depth` setting. |

Free-form prose inside a reviewer section (outside the bullet list) is passed to the
reviewer verbatim as additional instructions — use it for team-specific lore that doesn't
fit a key.

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
