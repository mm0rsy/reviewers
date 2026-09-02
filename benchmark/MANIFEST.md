# Benchmark manifest — ground truth

`benchmark/repo/` is a small, fixed repo with 15 deliberately planted issues across three
domains (Backend, DevOps, Technical Writing), reviewed by `review.md` in that directory.
This manifest is the ground truth, written **before** running any review, so scoring in
`RESULTS.md` isn't fitted to whatever the model happened to find. "Detected" in the results
means the finding (or an equivalent describing the same defect) appears in that reviewer's
report or the synthesis, at any severity — severity match is scored separately.

None of the secrets below are real; `sk-live-9f8e7d6c5b4a` is a fake, deliberately
planted string, same convention as `examples/`.

| ID | Domain | File:line | Severity (expected) | Description |
|----|--------|-----------|----------------------|--------------|
| B1 | Backend | `src/orders.py:3` | CRITICAL | Hardcoded live-looking API key as a module constant |
| B2 | DevOps | `Dockerfile:4` | CRITICAL | Same key baked into the image via `ENV` |
| B3 | Backend | `src/orders.py:5` | MAJOR | Function named `calc_tot` — banned abbreviation per `docs/python-style.md` (should be `calculate_total`) |
| B4 | Backend | `src/orders.py:5,12` | MAJOR | No type hints on `calc_tot` or `apply_tax`, required by the style guide |
| B5 | Backend | `src/orders.py:6-8` | MAJOR | No input validation on `discount_pct` (accepts <0 or >100) |
| B6 | Backend | `src/orders.py:12` | MAJOR | No input validation on `rate` in `apply_tax` (negative rate silently wrong) |
| B7 | Backend | `src/orders.py:7,9` | MAJOR | Bare `except:` swallows all errors and returns 0, per the style guide's explicit ban |
| B8 | Backend | `src/orders.py:1` | MINOR | Unused `import os` |
| B9 | DevOps | `Dockerfile:1` | MAJOR | Floating `python:latest` base tag — unreproducible builds |
| B10 | DevOps | `Dockerfile` (whole file) | MAJOR | No `.dockerignore` — full build context (incl. `.git`) copied into the image |
| B11 | DevOps | `Dockerfile` (whole file) | MINOR | No `USER` instruction — container runs as root |
| B12 | DevOps | `Dockerfile` (whole file) | MINOR | Single monolithic layer — no separated dependency-install step for cache efficiency |
| B13 | Technical Writing | `README.md:5` | MAJOR | Documents `calculate_total(items)`, which does not exist — actual function is `calc_tot(items, discount_pct)` |
| B14 | Technical Writing | `README.md:5` | MAJOR | Says discounts are "applied automatically", contradicting the required `discount_pct` argument |
| B15 | Technical Writing | `README.md:5` | MINOR | Typo: "automaticaly" |

**Known cross-domain relationships** (not separately scored, but the synthesis is expected
to surface them): B1+B2 are the same secret leaking through two surfaces; B3+B13+B14 are the
same rename event breaking the docs; B5+B6+B7 are the module's inconsistent/absent error
handling, expected as a project-level observation rather than three isolated notes.

Not counted as a planted "bug" but worth tracking separately: whether the run flags the
**entirely unreviewed surface** — `review.md` itself has no reviewer whose glob matches it,
so a change to the contract gets zero review coverage. A strong synthesis should note this
as a coverage gap.
