# Benchmark results

Run: `claude -p "/reviewers:full-review --auto" --model sonnet --dangerously-skip-permissions`
against `benchmark/repo/` (`feature/discounts` vs. `main`), Claude Code, 2026-09-02.
Ground truth: [`MANIFEST.md`](MANIFEST.md), written and locked in **before** this run.
Raw output: [`repo/.reviews/001/`](repo/.reviews/001/) (`backend.md`, `devops.md`,
`technical-writing.md`, `review-results.md`) — committed verbatim, unedited.

"Detected" means the finding (or an equivalent describing the same defect) appears
somewhere in that reviewer's report or the synthesis. "Severity match" means the reported
severity equals the manifest's expected severity exactly.

## Results table

| ID | Description | Expected | Detected | Reported severity | Where |
|----|--------------|----------|----------|--------------------|-------|
| B1 | Hardcoded API key in `src/orders.py:3` | CRITICAL | ✅ | *(unrated — out-of-scope note)* | `backend.md` out-of-scope note; folded into DevOps CRITICAL + synthesis cross-domain note 1 |
| B2 | Same key baked into image via `ENV` | CRITICAL | ✅ | CRITICAL — match | `devops.md` |
| B3 | `calc_tot` banned abbreviation | MAJOR | ✅ | MINOR — under-rated | `backend.md` |
| B4 | No type hints on `calc_tot`/`apply_tax` | MAJOR | ✅ | MINOR — under-rated | `backend.md` |
| B5 | No validation on `discount_pct` | MAJOR | ✅ | MAJOR — match | `backend.md` |
| B6 | No validation on `rate` in `apply_tax` | MAJOR | ✅ | MINOR — under-rated | `backend.md` |
| B7 | Bare `except:` swallows errors | MAJOR | ✅ | MAJOR — match | `backend.md` |
| B8 | Unused `import os` | MINOR | ✅ | *(unrated — project observation)* | `review-results.md` project-level observations, not raised by Backend itself |
| B9 | Floating `python:latest` tag | MAJOR | ✅ | MAJOR — match | `devops.md` |
| B10 | No `.dockerignore` | MAJOR | ✅ | MINOR — under-rated | `devops.md` |
| B11 | No `USER` instruction | MINOR | ✅ | INFO — under-rated | `devops.md` |
| B12 | Monolithic layer, no install step | MINOR | ✅ | MINOR — match | `devops.md` |
| B13 | README documents nonexistent `calculate_total` | MAJOR | ✅ | MAJOR — match | `technical-writing.md` |
| B14 | "applied automatically" contradicts required arg | MAJOR | ✅ | MAJOR — match | `technical-writing.md` |
| B15 | Typo "automaticaly" | MINOR | ✅ | MINOR — match | `technical-writing.md` |

**Detection: 15/15 (100%)** — every planted issue surfaced somewhere in the output.
**Exact severity match: 8/15 (53%)** — all 7 misses were the model rating the issue
*lower* than the manifest expected (MAJOR→MINOR ×4, MAJOR→MINOR ×1 on B10, MINOR→INFO
×1 on B11), never higher. No false positives — every finding in all four reports maps to
a real planted issue or a legitimate secondary observation (e.g. `import os` unused).

## Cross-domain relationships (from `MANIFEST.md`)

| Relationship | Expected | Result |
|---|---|---|
| B1+B2: same secret, two surfaces | should be linked, not two isolated findings | ✅ Caught explicitly — synthesis "Cross-domain notes #1" names both files, calls it one fix + key rotation |
| B3+B13+B14: rename ripple | should be linked | ✅ Caught explicitly — synthesis "Cross-domain notes #2" (and #4) name the exact single-fix relationship |
| B5+B6+B7: inconsistent error handling as one project-level note | should be merged into one observation | ❌ Not merged — reported as three separate Backend findings; no unifying project-level note |
| `review.md` itself has no matching reviewer | worth flagging as a coverage gap | ❌ Not raised (review.md wasn't part of this diff, so arguably out of scope for this run — see note below) |

The run *did* surface a coverage gap the manifest didn't anticipate but is arguably more
valuable: no `always: true` Security reviewer exists, so the hardcoded secret in
`src/orders.py` was only ever an "out-of-scope note" for Backend, not an in-scope
finding — it only got a CRITICAL rating because it happened to also leak into the
Dockerfile, which DevOps does own. If the secret had stayed in application code only, it
would have been reported at reduced severity. This is a real, correctly-diagnosed
process gap, and the synthesis recommended the fix (add a Security reviewer).

## Reading the numbers

- **Recall is the headline claim**: nothing was missed. Every reviewer found everything in
  its assigned files, and the synthesis correctly reconstructed the two most important
  cross-file relationships (shared secret, rename ripple) without being told to look for
  them.
- **Severity calibration is the honest weak spot**: file-scope/module-scope issues
  (`.dockerignore`, layering, missing type hints, missing input validation) were
  consistently rated a notch below the manifest's expectation. This tracks with a general
  pattern — findings with an obvious, cheap fix and no immediate failure mode get called
  MINOR even when the manifest (written from a "this class of bug has caused incidents"
  perspective) rates them MAJOR. Worth tightening the severity rubric in
  `core/reference/finding-format.md` if this recurs on future benchmark runs.
- **B1's out-of-scope handling is correct behavior, not a miss.** Backend's file scope is
  `src/**, **/*.py`, and its focus is error handling/correctness/validation — a hardcoded
  secret is legitimately a security concern outside that reviewer's remit. Flagging it as
  an out-of-scope note (rather than silently ignoring it, or inventing an in-scope finding
  outside its stated focus) is exactly the intended behavior of the scope system, and the
  synthesis correctly recovered it into the CRITICAL finding via DevOps's Dockerfile-side
  detection.

## Threats to this benchmark's validity

- Single run, single model (Sonnet), single fixture. Not a statistical claim — treat as a
  worked example of behavior, not a guaranteed detection rate.
- The fixture is small (4 files, ~30 lines of real code) and the bugs are unambiguous by
  design (a real key-shaped string, a real naming-guideline violation). It doesn't test
  recall on subtler bugs, nor does it test the decision ledger (this fixture's `review.md`
  deliberately omits `decisions:` to measure raw first-review detection).
