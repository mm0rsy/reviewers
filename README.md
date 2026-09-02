# Reviewers — review.md-driven multi-domain code review

[![npm](https://img.shields.io/npm/v/reviewers?logo=npm)](https://www.npmjs.com/package/reviewers)
[![sync-check](https://github.com/mm0rsy/reviewers/actions/workflows/sync-check.yml/badge.svg)](https://github.com/mm0rsy/reviewers/actions/workflows/sync-check.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

![reviewers demo — contract, roster, parallel reviewers, cross-domain synthesis](assets/demo.gif)
*Replay of a real `--auto` run on the [`examples/`](examples/) sample repo — all review text
is verbatim model output; only the pacing is scripted for the recording.*

One plugin, four platforms: **Claude Code**, **GitHub Copilot CLI**, **Google Antigravity**,
and **openCode**. Your team commits a single `review.md` to each repository; the plugin turns
it into a panel of domain reviewers (backend, frontend, devops, embedded, testing, technical
writing, …) that review every change the same way, for every team member, on every platform.

## How it works

1. `review.md` (repo root) defines the roster: one `## Reviewer:` section per domain or
   file-type, with file globs, focus areas, and links to your **coding guidelines / naming
   convention docs** — whose content is enforced verbatim during reviews.
2. `/reviewers:full-review` diffs your branch (or a PR/MR), activates only the reviewers whose
   globs match the changed files, and shows you the roster for confirmation.
   Add `--auto` to run unattended (e.g. from an outer orchestrator or CI).
3. Each reviewer writes its own report to `.reviews/<NNN>/<reviewer>.md` in a standard
   finding format (severity, file:line, guideline citation, suggested fix).
4. The orchestrator synthesizes `.reviews/<NNN>/review-results.md`: findings deduplicated
   across reviewers, **cross-domain checks** (conflicting fixes, ripple effects, shared root
   causes, coverage gaps), and a fix plan grouped by file so fixing takes minimum effort.
   Re-running after fixes finds the prior iteration automatically and adds a **"Since last
   review"** section classifying findings as resolved, persisting, or new (plus prior
   findings whose files weren't re-checked this time) — reviewers never see this history,
   only synthesis compares iterations.

No reviewers are hardcoded — the roster always comes from `review.md`, so adding a domain is
a one-file edit, no plugin update.

## What the output looks like

Excerpted **verbatim** from [`examples/review-results.md`](examples/review-results.md) — a
genuine `--auto` run against a sample repo with deliberately planted bugs (the "secret" is a
sanitized fake). Three reviewers (Backend, DevOps, Technical Writing) ran independently;
this is the synthesis:

> ## Verdict
> **REQUEST-CHANGES** — 2 CRITICAL findings survive dedup (the same live-looking secret
> hardcoded in two files), plus 5 MAJOR findings including a broken public API that the new
> README section documents incorrectly.
>
> ## Cross-domain notes
> 1. **Shared root cause — same secret hardcoded twice.** Backend flagged
>    `API_KEY = "sk-live-0000EXAMPLE0000"` in `src/orders.py:3` (CRITICAL); DevOps flagged
>    the identical value baked into `Dockerfile:4` via `ENV API_KEY=...` (CRITICAL). […]
>    A single upstream fix resolves both CRITICALs […] and **rotate the key** — it must be
>    treated as compromised regardless of which fix lands first.
> 2. **Ripple effect — API rename broke the docs, and the style guide already prescribes
>    the fix.** […] Backend's "banned abbreviation" finding, the README's
>    outdated-but-correct name, and Technical Writing's broken-doc finding all point to the
>    **same single fix**: rename the function back to `calculate_total` […] rather than
>    fixing the code and docs in two unsynchronized passes.
> 3. **Coverage gap — no always-on security reviewer.** Both hardcoded-secret findings were
>    only caught because the secret happened to land in files already matched by Backend's
>    and DevOps's globs. […] Recommend adding an `always: true` Security reviewer.
>
> ## Settled by prior decisions
> - **D-001** (floating `python:latest` base tag, bounds: Dockerfile at repo root) —
>   correctly not re-raised by DevOps; the base-image state is unchanged and stays within
>   bounds.
> - **Revisit candidate: D-002** […] Flagged again for a human to supersede D-002 or fix
>   the condition — the orchestrator does not reopen decisions automatically, and repeating
>   this note every iteration without action is a sign the decision needs owner attention.

No single-domain reviewer produces notes like these — they come from the synthesis pass
reading all reports against each other and the decision ledger. The full run is committed in
[`examples/`](examples/): the `review.md` contract, the ledger entries, an individual
reviewer report, and the complete `review-results.md` with the per-file fix plan.

## Benchmark

[`benchmark/`](benchmark/) is a small fixture repo with **15 deliberately planted issues**
across three domains, a ground-truth manifest written *before* any review ran, and the
unedited output of a real `--auto` run scored against it:

| | |
|---|---|
| Detection | **15/15 (100%)** — every planted issue surfaced somewhere in the output |
| Exact severity match | 8/15 — the rest were rated lower than expected, never higher, and there were no false positives |
| Cross-domain links | Caught both the shared-secret and rename-ripple relationships without being told to look for them |

Full scoring, methodology, and the raw reviewer reports: [`benchmark/RESULTS.md`](benchmark/RESULTS.md).

## PR/MR integration — findings where the team already looks

Run `/reviewers:full-review --auto` in CI and get findings posted as **inline PR/MR review
comments**, plus a severity gate that fails the job on `CRITICAL` (configurable). Supported on
both GitHub and GitLab, built on `gh`/`glab` — the same CLIs `full-review` already uses for
diff fetching, so no hand-rolled HTTP/auth layer.

Each inline comment carries a hidden identity marker (hashed from reviewer + file + line +
title), so re-running the workflow on a new push never re-posts a finding that's still open —
only genuinely new findings get commented.

### GitHub Actions

```yaml
# .github/workflows/reviewers.yml
on: pull_request

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: mm0rsy/reviewers@main
        with:
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          fail-on: critical   # critical | major | minor | none
```

See [`action.yml`](action.yml) for every input (`model`, `post-comments`, `pr-number`,
`github-token`).

### GitLab CI

```yaml
# .gitlab-ci.yml
include:
  - remote: 'https://raw.githubusercontent.com/mm0rsy/reviewers/main/gitlab/reviewers.gitlab-ci.yml'

reviewers:
  extends: .reviewers
  rules:
    - if: $CI_MERGE_REQUEST_IID
```

**Prerequisite**: your job image must provide the [`glab` CLI](https://gitlab.com/gitlab-org/cli#installation)
(e.g. `apk add glab` on Alpine-based images) — the job checks for it and fails fast with
instructions if it's missing, rather than installing tools on your behalf.

Set `ANTHROPIC_API_KEY` and `GITLAB_TOKEN` (a project/group access token with `api` scope —
not `CI_JOB_TOKEN`, whose MR-discussion permissions are inconsistent across GitLab
versions/settings) as CI/CD variables. See
[`gitlab/reviewers.gitlab-ci.yml`](gitlab/reviewers.gitlab-ci.yml) for the full variable list
(`REVIEWERS_FAIL_ON`, `REVIEWERS_MODEL`, `REVIEWERS_POST_COMMENTS`, `REVIEWERS_REF`).

## The decision ledger — a review that remembers

Add `- decisions: .reviewers/decisions/` to review.md's Settings and reviews gain memory.
The ledger records **settled decisions**: trade-offs the team accepted deliberately, which
would otherwise resurface as findings in every review. Each entry states the decision, its
rationale, which reviewers it binds, its **bounds** (where it holds), and an optional
revisit condition. Reviewers then stop re-raising the decided matter inside those bounds —
and start **enforcing** them: the same pattern spreading beyond its bounds is flagged, citing
the decision. Synthesis reports revisit conditions that appear to have been met.

The recommended layout is one `D-NNN-<slug>.md` file per decision in that directory —
parallel branches settling decisions merge cleanly and each decision keeps its own git
history; a single-file ledger (`decisions: docs/review-decisions.md` with `## D-NNN`
sections) is equally supported for small teams. Entries get written by the learning loop:
when you reject a finding as intentional during an interactive review, the orchestrator
drafts the entry and writes it after your confirmation. Unattended runs (`--auto`, CI) never
amend the ledger — candidate decisions are only suggested in `review-results.md`. Because the
ledger is committed (never gitignore it — the plugin warns if you do), every settled decision
propagates to the whole team on every platform, reviewable in PRs like any other change. See
`core/reference/decision-ledger.md` for the entry format.

## Baseline — parking known debt, distinct from the ledger

Add `- baseline: .reviewers/baseline.md` to review.md's Settings to suppress **specific**
findings the team already knows about but hasn't fixed. This is a different claim from the
ledger: a ledger entry says "this is deliberate, stop flagging the pattern" (and enforces its
bounds); a baseline entry says only "this instance is known debt, stop repeating it" — no
judgment that it's acceptable, and no coverage of other instances of the same issue elsewhere.
Baseline entries are never shown to reviewers — they report everything they find, and
suppression happens only during synthesis, so raw findings stay complete. Suppressed findings
move to a `## Suppressed by baseline` section (never silently dropped), and entries whose finding
was re-checked and no longer reproduces get flagged as stale, so the baseline doesn't quietly rot
(an entry whose file simply wasn't in the diff is never mistaken for fixed). Like
the ledger, entries are written by the learning loop — but from a different acknowledgment
("known issue, not fixing now" rather than "that's intentional"). See
`core/reference/baseline.md` for the entry format and the full comparison with the ledger.

## Install

### Claude Code
```
/plugin marketplace add mm0rsy/reviewers        # or a local clone path
/plugin install reviewers@reviewers-marketplace
```

### GitHub Copilot CLI
```
copilot plugin marketplace add mm0rsy/reviewers
copilot plugin install reviewers@reviewers-marketplace
```

### openCode
```
npx reviewers --opencode [--global] [path-to-your-project]
```
or from a clone:
```
git clone https://github.com/mm0rsy/reviewers.git && cd reviewers
scripts/install.sh --opencode [--global] [path-to-your-project]
```
Commands appear as `/reviewers/full-review` and `/reviewers/init`.

### Google Antigravity
```
npx reviewers --antigravity [path-to-your-project]
```
(or `scripts/install.sh --antigravity` from a clone.)
Workflows appear as `/reviewers-full-review` and `/reviewers-init`.

> **Antigravity is project-scoped, not directory-scoped.** The CLI (`agy`) resumes whatever
> project it last had open rather than inferring one from your shell's working directory —
> open the target repo as the active project in the app (or pass `--new-project --add-dir`
> pointed at it) before triggering a workflow, or it will review the wrong repo. On a large
> diff, headless synthesis can also exceed the default 5-minute print timeout; pass
> `--print-timeout` with more headroom.

## Getting started in a repo

```
/reviewers:init          # inspects your stack, interviews you, writes review.md
# ...edit review.md, link your guideline docs, commit it...
/reviewers:full-review           # interactive: confirm the roster first
/reviewers:full-review --auto    # unattended end-to-end
/reviewers:full-review 128       # review PR/MR #128 (gh/glab)
/reviewers:full-review --staged  # review staged changes only
/reviewers:extend CAPL           # build a reviewer for a domain we don't ship
```

## Extending to new domains (CAPL, Go, Rust, anything)

The plugin ships templates for common domains, but the roster is never limited to them —
any `## Reviewer:` section in review.md works. For a technology without a built-in template,
`/reviewers:extend <domain>` builds one **with** you: it finds the tech's footprint in your
repo (verified globs), drafts priority-ordered focus areas from the technology's real
failure modes, generates a starter guideline doc (`docs/<domain>-guidelines.md`) for your
team to refine, and wires both into review.md with a dry-run parse. The annotated minimal
reference it builds on is `core/templates/_custom.md` — itself extendable. Everything lands
in *your repo* and spreads to the whole team by committing review.md; re-run
`/reviewers:extend <domain>` anytime to deepen an existing reviewer.

See `review.md.example` for a starter contract and
`core/reference/review-schema.md` for the full schema.

## Repository layout

- `core/` — **canonical source**: command bodies, reference specs (schema, reviewer prompt
  template, finding format, synthesis rules), domain templates. Edit here only.
- `commands/`, `skills/review-orchestration/references/`, `adapters/` — **generated** by
  `scripts/sync.sh` (Claude Code/Copilot surface, openCode tree, Antigravity tree).
  CI fails on drift (`scripts/sync.sh --check`).
- `scripts/install.sh` — per-platform installer (copy, or `--link` to symlink a clone).

## Contributing

Edit files under `core/` (or `skills/review-orchestration/SKILL.md` / `scripts/headers/`),
run `scripts/sync.sh`, and commit the regenerated output together with your change.

## License

[Apache-2.0](LICENSE) — © Mohamed Morsy. The `reviewers` name is not licensed for use on
derivative works (Apache-2.0 §6).
