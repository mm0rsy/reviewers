# Reviewers — review.md-driven multi-domain code review

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

No reviewers are hardcoded — the roster always comes from `review.md`, so adding a domain is
a one-file edit, no plugin update.

## Install

### Claude Code
```
/plugin marketplace add <owner>/<repo>        # or a local clone path
/plugin install reviewers@reviewers-marketplace
```

### GitHub Copilot CLI
```
copilot plugin marketplace add <owner>/<repo>
copilot plugin install reviewers@reviewers-marketplace
```

### openCode
```
git clone <repo-url> && cd <repo>
scripts/install.sh --opencode [--global] [path-to-your-project]
```
Commands appear as `/reviewers/full-review` and `/reviewers/init`.

### Google Antigravity
```
scripts/install.sh --antigravity [path-to-your-project]
```
Workflows appear as `/reviewers-full-review` and `/reviewers-init`.

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
