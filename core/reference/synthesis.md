# Synthesis Rules — generating review-results.md

After all reviewer reports exist under `.reviews/<NNN>/`, the orchestrator reads every report
and produces `.reviews/<NNN>/review-results.md`. The goal: the author fixes everything with
the **minimum effort** — one pass per file, no contradictory advice, no duplicate work.

## Step 0 — Load the prior iteration (incremental re-review)

Look under the output root for the numerically highest iteration below `<NNN>` that contains a
`review-results.md`. If none exists, this is the first review — skip this step and every
"Since last review" instruction below entirely (no such section appears in the output).

When a prior iteration exists, read its `## Fix plan by file` (and `### Cross-cutting`)
entries — this is the prior **open-findings baseline**. Findings already listed under that
iteration's `## Settled by prior decisions` are not part of the baseline: they were settled,
not open, and reviewers now withhold them by design (`decision-ledger.md`), so they must not
be reported as "resolved" — they simply don't recur.

Reviewers are never shown this history — each report is written blind to prior iterations, so
individual reviewer judgment stays uncontaminated. Matching prior findings against the current
ones is entirely the synthesis step's job, done here in Step 3.

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
3. `## Since last review` — only when Step 0 found a prior iteration. Four lists, each
   entry `[SEVERITY][scope] title (reviewers) — file` :
   - **Resolved (n)** — findings open in the prior baseline that no longer appear, whose file
     and reviewer are both still active this iteration (so the absence is a real re-check, not
     a gap in coverage). Include "first seen: iteration NNN".
   - **Persisting (n)** — findings open in the prior baseline that still appear this iteration.
     Include "first seen: iteration NNN" and, if severity or category shifted since then, say so
     (e.g. "severity raised MAJOR→CRITICAL since 002").
   - **New (n)** — findings this iteration that have no match in the prior baseline. Title
     line only — their full entries live in the fix plan.
   - **Not re-checked (n)** — findings open in the prior baseline whose file is no longer in the
     change set, or whose reviewer is no longer in the active roster this iteration, so their
     status is genuinely unknown. Never claim these are resolved.
   "First seen" carries forward: when the prior entry already had a `(persisting since NNN)`
   tag, keep that NNN; otherwise first seen is the prior iteration's number. This keeps the
   origin stable across three or more iterations.
   Matching a prior finding to a current one is a judgment call made here, not by the
   reviewers, who never see this history (Step 0): same reviewer + same file + the same
   underlying issue — title wording may differ, and line-number drift alone is never a
   mismatch. When in doubt whether two findings are the same issue, prefer NEW over a false
   PERSISTING; never invent a persistence that isn't clearly the same defect.
4. `## Cross-domain notes` — conflicts, ripples, shared root causes, coverage gaps.
5. `## Project-level observations` — the once-per-review project-scope pass (Step 2, item 6).
6. `## Settled by prior decisions` — only when a ledger is active and it applied: findings
   settled within decision bounds (with entry IDs), plus any met revisit conditions and
   `--auto` candidate decisions.
7. `## Fix plan by file` — one subsection per file, findings ordered by severity, each entry:
   `[SEVERITY][scope] title (reviewers) — file:line` + merged suggested fix. When a finding is
   PERSISTING (Step 3, item 3), append `(persisting since NNN)` to its entry — NNN is the
   first-seen iteration from that step — so it's visible without cross-referencing
   "Since last review". Shared-root-cause findings appear once under
   the file where the fix belongs, with pointers from the others. Module/domain/project-scope
   items without a single natural file go in a final `### Cross-cutting` subsection.
8. `## Positive observations` — merged from all reports (deduplicated).
9. `## Appendix` — links to each individual reviewer report.

## Rules
- Never drop a finding silently: every finding from every report appears in the fix plan,
  merged, or is explicitly listed under a cross-domain note that supersedes it. The same
  applies across iterations: a prior finding that stops appearing is reported as Resolved or
  Not re-checked (Step 3, item 3) — never simply omitted.
- Do not soften severities during merge; only raise (when a second reviewer confirms impact).
- The synthesis adds no brand-new findings of its own — its judgments are limited to merging,
  conflict resolution, root-cause linking, and (when a prior iteration exists) matching
  findings across iterations. New concerns noticed during synthesis go under
  `## Cross-domain notes` clearly marked as orchestrator observations.
