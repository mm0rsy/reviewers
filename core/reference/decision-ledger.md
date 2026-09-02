# Decision Ledger — the review contract's memory

The decision ledger is a **committed** markdown file recording review decisions the team has
settled: trade-offs accepted deliberately, exceptions to guidelines, architectural choices
that would otherwise look like defects to a fresh reviewer. It exists so settled matters are
never re-litigated — and so their *limits* are enforced.

It is activated by linking it from review.md's `## Settings`:

```markdown
- decisions: docs/review-decisions.md
```

No `decisions:` setting (or a missing file) → the feature is simply inactive. Like review.md
itself, the ledger must be committed — that is what makes it team memory that reaches every
member on every platform. Never place it under the review output directory (typically
gitignored and local).

## Entry format

One `## D-NNN` section per decision, appended in order, IDs never reused:

```markdown
## D-003 — Direct DB access from reporting module (2026-09-02)
- Decision: reporting/ may query the orders DB directly, bypassing the API layer.
- Rationale: query volume; API pagination too slow. Origin: review 004, [MAJOR] layering.
- Binds: Architecture, Backend
- Bounds: reporting/** only, read-only queries
- Revisit-when: read replica lands (ticket PLAT-212)
```

| Key | Required | Meaning |
|---|---|---|
| `Decision` | yes | What the team settled, one or two sentences, imperative and testable. |
| `Rationale` | yes | Why — plus origin (review iteration / finding) when it came from a review. |
| `Binds` | yes | Comma-separated reviewer names the decision applies to, or `all`. |
| `Bounds` | yes | Where it holds: globs, modules, or conditions. `everywhere` is allowed but suspect — most real decisions have limits. |
| `Revisit-when` | no | A condition that reopens the decision (a ticket landing, a version bump, a date). Omit or `never` for permanent decisions. |
| `Superseded-by` | no | `D-MMM`. Entries are never deleted or edited into reversal — supersede them so history stays honest. |

Free-form prose after the bullets is allowed and passed along verbatim.

## Semantics (for the orchestrator and reviewers)

1. **Inside bounds: settled.** A reviewer bound by an entry must not raise findings that
   contradict the decision within its bounds. The matter is closed until its
   `Revisit-when` fires or it is superseded.
2. **Outside bounds: enforced.** The same pattern appearing *beyond* the entry's bounds is a
   finding — cite the entry in the finding's `Guideline:` field (e.g. `decisions D-003`).
   A ledger that only suppressed would rot; the bounds are what keep it alive.
3. **Distribution.** Domain reviewers receive only the entries that bind them (by name or
   `all`), inlined into their prompt. Reviewers with `always: true` (Architecture, Security,
   …) and the synthesis step read the **entire** ledger — cross-domain decisions are
   precisely their territory.
4. **Revisit checks.** During synthesis, cheaply verifiable `Revisit-when` conditions (a file
   now exists, a branch merged, a date passed) are checked; met conditions are reported as
   "revisit candidates" — the orchestrator never reopens a decision on its own.
5. **Superseded entries are inert** except as history; only the superseding entry has force.

## Writing entries — the learning loop

Entries are written by hand at any time, or captured at the end of an interactive review:
when the author rejects a finding as *intentional* ("we know — that's deliberate"), the
orchestrator drafts a complete entry (Decision, Rationale with origin, Binds, Bounds,
Revisit-when) and appends it **only after the author confirms** — the ledger is part of the
team contract, and amending it is the team's call, not the tool's. Suggest bounds narrower
than the author's first instinct; "everywhere, forever" is rarely the real decision.

In unattended runs (`--auto`, CI) the orchestrator never writes the ledger. Candidate
decisions it notices go in review-results.md as suggestions for a human to adopt.
