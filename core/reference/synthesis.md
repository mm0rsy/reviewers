# Synthesis Rules — generating review-results.md

After all reviewer reports exist under `.reviews/<NNN>/`, the orchestrator reads every report
and produces `.reviews/<NNN>/review-results.md`. The goal: the author fixes everything with
the **minimum effort** — one pass per file, no contradictory advice, no duplicate work.

## Step 1 — Collect and deduplicate
- Parse every finding from every report (they share the standard format). If a report drifted
  from the canonical severity labels, normalize while parsing (HIGH→MAJOR, MEDIUM→MINOR,
  LOW→INFO, BLOCKER→CRITICAL) and note the drift in the appendix.
- Findings from different reviewers pointing at the same file+line/behavior are **merged into
  one entry** listing all reporting reviewers; keep the highest severity and the most concrete
  suggested fix.

## Step 2 — Cross-domain checks (the value-add)
Actively look for interactions between reports; record each as a `## Cross-domain note`:

1. **Conflicts** — two reviewers' suggested fixes are incompatible (e.g., security wants input
   rejected, backend wants it coerced). State both positions and recommend a resolution.
2. **Ripple effects** — a suggested fix in one domain would create a violation in another
   (e.g., renaming an API field for naming conventions breaks the frontend contract; a
   performance fix that removes validation). Flag before the author walks into it.
3. **Shared root cause** — several findings across domains trace to one underlying decision
   (a missing abstraction, a wrong data shape). Propose the single upstream fix that resolves
   them all instead of N local patches.
4. **Coverage gaps** — changed files no reviewer's patterns matched. List them so review.md
   can be extended.
5. **Decision-ledger application** (only when review.md configures `decisions:`; see
   `decision-ledger.md`). A finding that contradicts a settled decision **within its bounds**
   is moved out of the fix plan into `## Settled by prior decisions` (finding + entry ID —
   listed, never silently dropped; reviewers should already have withheld these, so treat
   any that got through as normalization). A finding showing the decided pattern **beyond**
   its bounds stays in the fix plan, citing the entry ID. Also check each entry's
   `Revisit-when` condition where cheaply verifiable (file exists, branch merged, date
   passed) and list met ones as revisit candidates — never reopen a decision yourself.
   In `--auto` runs, note rejected-looking recurring findings as *candidate* decisions for
   a human to adopt; never write the ledger unattended.
6. **Project-level pass** — this is where `project`-scope review happens, exactly once.
   Having read every report and the full change set (and the full decision ledger when one
   is active), assess the change against the overall
   project: cross-module architecture drift, repo-wide consistency (naming, error handling,
   layering), and whether the change pushes the codebase in a direction the roster's domains
   individually wouldn't notice. Record results as `Scope: project` entries under
   `## Project-level observations`, clearly marked as orchestrator observations.

## Step 3 — Group for fixing
Order the output so it reads as a work plan:

1. `## Verdict` — overall: REQUEST-CHANGES if any reviewer requested changes or any
   CRITICAL/MAJOR survives dedup; otherwise APPROVE-WITH-COMMENTS or APPROVE.
2. `## Summary` — counts by severity and by reviewer, one-paragraph narrative of the themes.
3. `## Cross-domain notes` — conflicts, ripples, shared root causes, coverage gaps.
4. `## Project-level observations` — the once-per-review project-scope pass (Step 2, item 6).
5. `## Settled by prior decisions` — only when a ledger is active and it applied: findings
   settled within decision bounds (with entry IDs), plus any met revisit conditions and
   `--auto` candidate decisions.
6. `## Fix plan by file` — one subsection per file, findings ordered by severity, each entry:
   `[SEVERITY][scope] title (reviewers) — file:line` + merged suggested fix. Shared-root-cause
   findings appear once under the file where the fix belongs, with pointers from the others.
   Module/domain/project-scope items without a single natural file go in a final
   `### Cross-cutting` subsection.
7. `## Positive observations` — merged from all reports (deduplicated).
8. `## Appendix` — links to each individual reviewer report.

## Rules
- Never drop a finding silently: every finding from every report appears in the fix plan,
  merged, or is explicitly listed under a cross-domain note that supersedes it.
- Do not soften severities during merge; only raise (when a second reviewer confirms impact).
- The synthesis adds no brand-new findings of its own — its judgments are limited to merging,
  conflict resolution, and root-cause linking. New concerns noticed during synthesis go under
  `## Cross-domain notes` clearly marked as orchestrator observations.
