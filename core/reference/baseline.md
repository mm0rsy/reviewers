# Baseline — parking known debt, distinct from the decision ledger

The baseline is a **committed** list of specific findings the team has acknowledged but not
fixed yet. It exists so known debt stops showing up in every review as if it were new, without
pretending it's settled.

This is a different kind of memory from `decision-ledger.md`, and the two are not
interchangeable:

| | Decision ledger | Baseline |
|---|---|---|
| Says | "This is deliberate — stop flagging the pattern." | "This instance is known debt — stop repeating it." |
| Scope | A **pattern**, within `Bounds:` — new instances inside bounds are also covered, and the pattern spreading *beyond* bounds is itself a finding. | One **specific** already-known finding, matched by identity. A new instance of the same kind of bug elsewhere is not covered — it's a fresh finding. |
| Implies | The team is fine with this, indefinitely (until `Revisit-when`). | The team is *not* fine with this — it's debt, just not being fixed today. |
| Shown to reviewers | Yes — bound reviewers receive it, so they don't raise it and can enforce its bounds. | No — reviewers report everything they find; suppression happens only at synthesis. |
| Housekeeping | Revisit-when conditions get checked and reported. | Entries whose finding no longer reproduces get flagged as stale, for pruning. |

Use the ledger for "we chose this on purpose." Use the baseline for "we know, we haven't
gotten to it." A team can run both — a finding might start on the baseline (acknowledged, not
yet fixed) and later graduate to a ledger entry if the team decides to keep it permanently.

It is activated by linking it from review.md's `## Settings`:

```markdown
- baseline: .reviewers/baseline.md
```

No `baseline:` setting (or a missing path) → the feature is simply inactive. Single file only
(unlike the ledger, baseline entries are typically bulk-captured in one sitting rather than
authored one at a time, so one-per-file offers little benefit here).

Like review.md, the baseline must be **committed** — that's what makes it team memory instead
of a personal suppression list. Warn prominently if the configured path is matched by
.gitignore. Never place it under the review output directory (typically gitignored and local).

## Entry format

One `## B-NNN` section per suppressed finding, IDs never reused:

```markdown
## B-003 — Legacy retry loop lacks backoff (2026-09-02, from review 007)
- Finding: Backend — src/orders/retry.py — "Retry loop has no exponential backoff"
- Severity: MAJOR
- Reason: Known debt; scheduled for the queue-rework epic (ticket PLAT-341).
- Expires: 2026-12-01
```

| Key | Required | Meaning |
|---|---|---|
| `Finding` | yes | Identity of the suppressed finding: reviewer, file, and title/description close enough to re-match it later. Not the line number — code moves. |
| `Severity` | yes | The finding's severity when baselined, carried for reporting even while suppressed. |
| `Reason` | yes | Why it isn't being fixed now — a ticket reference, a scheduling note, a "not worth it yet." No rationale for *why it's acceptable* is required — unlike the ledger, the baseline doesn't claim the debt is fine, only that it's known. |
| `Expires` | no | A date (`YYYY-MM-DD`) prompting re-triage, or `never`/omitted for indefinite debt. A date only — free-form conditions belong in the ledger's `Revisit-when`, which synthesis evaluates; this is compared against today's date and nothing else. Nothing reopens automatically either way — an expired entry stays suppressed and is merely flagged for a re-look. |

Free-form prose after the bullets is allowed and passed along verbatim.

## Semantics (for synthesis only — reviewers never see this)

1. **Reviewers report everything.** The baseline is never inlined into a reviewer's prompt.
   Suppression is entirely a synthesis-time filter, so raw findings stay complete — the same
   separation of concerns as incremental re-review (`synthesis.md` Step 0): reviewers describe
   what's in the code, the orchestrator decides what the author needs to see acted on now.
2. **Matching.** During synthesis, each collected finding (after dedup) is checked against the
   baseline using the same judgment-based matching as incremental re-review: same reviewer +
   same file + the same underlying issue, not exact line. When in doubt, do not suppress —
   a missed suppression just repeats a known note; a wrongful suppression hides a real one.
3. **Suppressed findings are never dropped, only relocated.** A matched finding is pulled out
   of the fix plan and listed under `## Suppressed by baseline` instead, with its entry ID —
   satisfying the "never drop a finding silently" rule the same way the decision ledger does.
4. **Staleness check — only for entries actually re-checked.** An entry is a **stale candidate**
   (a prompt for a human to prune it, never removed automatically) only when its issue was
   genuinely looked for and not found: the entry's file is in this iteration's change set *and*
   its reviewer is active, yet nothing matched. Reviews are diff-scoped, so on any given run
   most entries point at files nobody reviewed — those are simply not re-checked and carry
   forward silently. Flagging them would be the same mistake as calling an unreviewed prior
   finding "resolved" (`synthesis.md` Step 3), and it would push teams to prune live debt.
5. **Expiry check.** Entries whose `Expires` date is in the past are reported alongside stale
   candidates, as due for re-triage — still suppressed this run, just flagged. Read today's
   date from the system (e.g. `date +%F`) rather than assuming it.
6. **No bounds enforcement.** Unlike the ledger, a baseline entry says nothing about other
   instances of the same issue — those are ordinary new findings, reported normally.

## Writing entries — the learning loop

Baselined at any time by hand, or captured at the end of an interactive review (Step 10 of
`full-review.md`): when the author acknowledges a finding without calling it correct or
intentional ("known issue, not fixing now" — distinct from "that's deliberate," which is the
ledger's cue), the orchestrator drafts a complete entry (Finding, Severity, Reason, optional
Expires) and appends it **only after the author confirms**. If no baseline is configured yet,
offer to create one (default `.reviewers/baseline.md`) and add `- baseline: <path>` to
review.md's Settings.

In unattended runs (`--auto`, CI) the orchestrator never writes the baseline. Recurring
findings that look like debt rather than disputes go in review-results.md as suggestions for a
human to baseline (or, if truly permanent, ledger).
