---
description: Run the full multi-domain review defined by the team's review.md (per-reviewer reports + cross-domain review-results.md)
argument-hint: "[--auto] [--staged] [PR/MR number]"
disable-model-invocation: false
---

> Platform note: if `${CLAUDE_PLUGIN_ROOT}` is not expanded on this platform, resolve
> reference paths relative to this plugin's installed root (the directory containing
> `commands/` and `skills/`), e.g. `<plugin-root>/skills/review-orchestration/references/`.

# Full Review — multi-domain, review.md-driven

You are the **review orchestrator**. Conduct a complete multi-reviewer code review driven by
the team's `review.md`, producing per-reviewer reports and a synthesized `review-results.md`.

Reference documents (read them when the step says so — do not improvise their content):
- `${CLAUDE_PLUGIN_ROOT}/skills/review-orchestration/references/review-schema.md` — how to parse review.md
- `${CLAUDE_PLUGIN_ROOT}/skills/review-orchestration/references/reviewer-prompt.md` — template for each reviewer's prompt
- `${CLAUDE_PLUGIN_ROOT}/skills/review-orchestration/references/finding-format.md` — the report format every reviewer must follow
- `${CLAUDE_PLUGIN_ROOT}/skills/review-orchestration/references/synthesis.md` — rules for the final review-results.md

Arguments given by the user: `$ARGUMENTS`
- `--auto` → skip the roster confirmation (step 5) and proceed end-to-end without questions.
- A PR/MR number or URL → review that PR/MR instead of the local branch.
- `--staged` → review only staged changes.
- Anything else: treat as a hint for the diff base or scope.

## Step 1 — Locate review.md
Look for `review.md` at the repository root, then `.reviewers/review.md`. If neither exists,
stop and tell the user to run `/reviewers:init` to create one (do not invent a roster).

## Step 2 — Parse the roster
Read `${CLAUDE_PLUGIN_ROOT}/skills/review-orchestration/references/review-schema.md`, then parse review.md accordingly: global settings
(`output`, `base`, `parallel`, `depth`) and every `## Reviewer:` section (files, guidelines,
focus, always, severity-floor, depth, free-form prose). Note warnings (unknown keys, missing guideline
files) — they go in the roster table, they never abort the review.

## Step 3 — Determine the change set
- Default: `git diff` against the merge-base with the default branch
  (`git merge-base HEAD origin/<default-branch>`; detect the default branch from
  `origin/HEAD` or fall back to main/master). If the settings specify `base: <branch>`, use that.
- `--staged`: `git diff --cached`.
- PR/MR argument: fetch the diff via `gh pr diff <n>` / `glab mr diff <n>` when available.
- Collect the list of changed files (repo-relative) and the full diff.
- If the change set is empty, report that and stop.

## Step 4 — Build the active roster
Match each changed file against each reviewer's `files` globs (git pathspec semantics).
A reviewer is **active** if it matches ≥1 file or has `always: true` (always-reviewers get
the full change set). Build a roster table:

| Reviewer | Trigger | Files assigned | Guidelines | Warnings |

Also list changed files matched by **no** reviewer — these become a coverage-gap note later.

## Step 5 — Confirm (skip with --auto)
Show the roster table and the planned output directory, then ask the user to confirm,
adjust (drop/add reviewers, change scope), or cancel. With `--auto`, print the table and
continue immediately.

## Step 6 — Create the iteration directory
Output root = `output` setting (default `.reviews/`). Find existing numbered subdirectories,
take max+1 zero-padded to 3 digits (first run → `001`), and create `<output>/<NNN>/`.
Every invocation runs a **fresh iteration** — never skip or reuse a previous iteration's
results, even if the change set looks identical (review.md, guidelines, or the plugin itself
may have changed). Prior iterations are history; with `--auto` this determinism is required.
Suggest adding the output root to `.gitignore` if it isn't ignored and isn't already
committed (teams may choose to commit reviews — respect the status quo).

## Step 7 — Dispatch the reviewers
Read `${CLAUDE_PLUGIN_ROOT}/skills/review-orchestration/references/reviewer-prompt.md` and `${CLAUDE_PLUGIN_ROOT}/skills/review-orchestration/references/finding-format.md`. For each active
reviewer, fill the template completely:
- inline the full content of each existing guideline file,
- list the assigned files and include the diff restricted to them (always-reviewers get the full diff),
- set the output path to `<output>/<NNN>/<reviewer-slug>.md`,
- set the scope-ladder depth (reviewer's `depth` override, else the global `depth` setting,
  else `module`),
- append the finding-format document verbatim.

Dispatch:
- **If this platform provides a subagent/task tool and `parallel` is not false**: launch each
  reviewer as its own subagent with its filled prompt; run them in parallel; wait for all.
- **Otherwise (no subagent mechanism)**: execute the reviewers yourself, strictly one at a
  time, adopting one reviewer persona per pass and writing that reviewer's report before
  starting the next. Never blend two reviewers' judgments in one pass.

Verify after dispatch that every expected report file exists and is non-empty; re-run any
reviewer that failed (once).

## Step 8 — Synthesize
Read `${CLAUDE_PLUGIN_ROOT}/skills/review-orchestration/references/synthesis.md`, then read every report in `<output>/<NNN>/` and write
`<output>/<NNN>/review-results.md` following those rules exactly: dedup, cross-domain
conflict/ripple/root-cause analysis, coverage gaps, the once-per-review **project-level
pass** (`Scope: project` observations — the reviewers deliberately stop at domain level),
and a fix plan grouped by file.

## Step 9 — Report back
Tell the user: the verdict, finding counts by severity, the most important cross-domain
notes, and the paths of `review-results.md` and the individual reports. Do not fix anything —
fixing is a separate decision that belongs to the author.
