---
name: review-orchestration
description: Use when conducting a team code review driven by a review.md contract — parsing the reviewer roster, composing domain reviewer prompts, enforcing the standard finding format, or synthesizing cross-domain review results. Companion knowledge for /reviewers:full-review and /reviewers:init.
---

# Review Orchestration

This skill carries the knowledge for review.md-driven multi-domain code reviews. The full
procedures live in the `/reviewers:full-review`, `/reviewers:init`, and `/reviewers:extend`
commands; this skill supplies the specifications they (and you, when asked ad-hoc review.md
questions) rely on.

## Reference documents (in `references/` next to this file)

| Document | Use when |
|---|---|
| `review-schema.md` | Parsing or authoring a review.md (roster, globs, guidelines, settings). |
| `reviewer-prompt.md` | Composing the prompt for one dynamic domain reviewer. |
| `finding-format.md` | Writing or validating a reviewer report (`.reviews/<NNN>/<slug>.md`). |
| `synthesis.md` | Merging reviewer reports into `review-results.md` with cross-domain checks. |
| `decision-ledger.md` | Reading/writing the team's settled-decision ledger (suppress within bounds, enforce beyond them, learning loop). Active only when review.md sets `decisions:`. |
| `templates/` | Starter `## Reviewer:` sections per domain for scaffolding review.md. |
| `templates/_custom.md` | Annotated meta-template for authoring a reviewer for ANY new domain (CAPL, Go, Rust, …) — the minimal reference `/reviewers:extend` builds on with the user. `_`-prefixed files are meta-templates, never proposed as domains. |

## Core principles

1. **review.md is the contract.** The roster is always derived from it at runtime — never
   from a hardcoded list. No matching review.md → point the user to `/reviewers:init`.
2. **Reviewers are composed, not pre-baked.** Each active reviewer gets a prompt built from
   `reviewer-prompt.md` with its guideline documents inlined verbatim.
3. **Reviewers report; they never edit code.** One report file per reviewer, in the standard
   finding format, under `.reviews/<NNN>/`.
4. **Synthesis minimizes fixing effort**: dedup across reviewers, detect cross-domain
   conflicts/ripples/shared root causes, group the fix plan by file.
5. **Platform-adaptive dispatch**: parallel subagents where a task tool exists; otherwise
   strict one-persona-per-pass sequential execution.
6. **Settled decisions stay settled — within their bounds.** When review.md links a decision
   ledger, bound reviewers never re-raise decided matters inside an entry's bounds, and flag
   the decided pattern spreading beyond them. The ledger is only ever amended with the
   author's explicit confirmation, never in unattended runs.
