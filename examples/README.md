# Example: one real review, end to end

Genuine output of `/reviewers:full-review --auto` (unedited except for one obviously fake
placeholder key), run against a small demo repository with **deliberately planted bugs**:
a fake API key baked into both `src/orders.py` and the `Dockerfile`, a breaking function
rename that desyncs the README, a bare `except:` swallowing errors, and assorted
Dockerfile hygiene gaps. Nothing in here refers to a real system or credential.

- [`review.md`](review.md) — the team contract that drove the review: three reviewers
  (Backend, DevOps, Technical Writing) with globs, guidelines, and a decision ledger.
- [`decisions/`](decisions/) — the ledger, one `D-NNN-<slug>.md` file per settled decision.
  D-001 settles the floating base-image tag; D-002 tolerates the bare `except:` in exactly
  one function.
- [`backend-report.md`](backend-report.md) — one reviewer's individual report in the
  standard finding format (scope-ladder tags, guideline citations, severity labels).
- [`review-results.md`](review-results.md) — the synthesized result. Worth reading for:
  - the **cross-domain notes**: the same fake secret traced to one root cause across two
    files, and the function rename's ripple into the docs with a fix ordering;
  - the **`Settled by prior decisions`** section: D-001's finding suppressed within its
    bounds, D-002 honored for `calc_tot` while the *neighboring* function's missing error
    handling is still flagged (outside the decision's bounds), and D-002's met revisit
    condition escalated to a human;
  - the **fix plan grouped by file**, ordered so fixing takes minimum effort.
