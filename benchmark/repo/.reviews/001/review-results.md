# Review Results — Review 001

Branch: `feature/discounts` · Base: `main` (merge-base `2b261c6`) · Commit reviewed: `0ebc20c`

## Verdict
**REQUEST-CHANGES** — every active reviewer independently returned REQUEST-CHANGES; one CRITICAL and four MAJOR findings survive dedup.

## Summary
| Severity | Count | By reviewer |
|---|---|---|
| CRITICAL | 1 | DevOps: 1 |
| MAJOR | 4 | Backend: 2, Technical Writing: 2 |
| MINOR | 8 | Backend: 4, DevOps: 2, Technical Writing: 2 |
| INFO | 2 | DevOps: 1, Technical Writing: 1 |

This is a small, self-contained PR (`Dockerfile`, `README.md`, `docs/python-style.md`, `src/orders.py` — all new files) that adds a discount calculation and dockerizes/documents it. The dominant theme across all three reviewers is **the same change introduces the exact problems its own new artifacts warn against**: the new style guide's naming example is violated by the new function it ships alongside, the new README describes a function that doesn't match the new code, and a live-looking secret is hardcoded in two places with no indirection through the environment despite `import os` already being present. None of the three reports overlap on file+line (each covers a disjoint file), so no findings were merged — but several are tightly linked and should be fixed together (see below).

## Cross-domain notes

### Shared root cause: hardcoded secret duplicated across code and image
Backend (out-of-scope note, `src/orders.py:3`) and DevOps (**CRITICAL**, `Dockerfile:4`) both independently flagged the same underlying secret: `API_KEY = "sk-live-9f8e7d6c5b4a"` is hardcoded as a module-level constant in `src/orders.py`, and that identical value is then baked again into the Docker image via `ENV API_KEY=sk-live-9f8e7d6c5b4a`. Fixing only the Dockerfile (removing the `ENV` line) is insufficient — the constant in `src/orders.py` is the origin and must be replaced with `os.environ["API_KEY"]` (module already imports `os` but never uses it). Treat this as **one fix, two files**: revoke the key, remove it from source, remove the `ENV` line, and read it from the environment at runtime.

### Coverage gap: no reviewer's *focus* actually covers the secret in `src/orders.py`
`src/orders.py` is only assigned to the Backend reviewer (focus: error handling, correctness, input validation), so the hardcoded key there was only ever raised as an "out-of-scope note," never as an in-scope finding — it happened to also surface via DevOps's Dockerfile review, but if the Dockerfile hadn't referenced it, it would have gone unflagged entirely. `review.md` has no `always: true` Security reviewer. **Recommendation:** add a Security reviewer section (`always: true`, focus: secrets, injection, authn/authz) per the schema's own example — this gap would otherwise recur for any future secret introduced in application code with no corresponding infra file.

### Ripple: Backend's naming fix would retroactively fix Technical Writing's #1 finding
Backend recommends renaming `calc_tot` → `calculate_total` (naming-convention finding, citing `docs/python-style.md`). Technical Writing's top MAJOR finding is that README.md documents a function called `calculate_total` that doesn't exist — the code is actually named `calc_tot`. **These are the same fact seen from two sides.** If Backend's rename is applied, README.md's function-name claim becomes correct without any doc edit; if the rename is *not* applied, README.md must instead be corrected to say `calc_tot`. Do not fix both independently — pick one target name and apply it once, then check the other file matches.

### Ripple: Backend's signature/behavior fixes must be reflected in the README
Backend's validation fix (bounds-check `discount_pct`, raise on out-of-range) and error-handling fix (replace bare `except:` with either a raised error or a specific caught exception) change the function's observable behavior on bad input from "silently returns 0" to "raises." Technical Writing separately flagged that README.md wrongly claims discounts are applied "automatically by the server" when `discount_pct` is actually a required argument. Once Backend's fix lands, the README rewrite should describe the *new* (post-fix) required-argument behavior and error semantics, not just the current buggy one — otherwise the docs will be re-broken the moment the code fix merges.

### Shared root cause: the style guide is violated by the code it ships next to
Technical Writing flagged (module-scope) that `docs/python-style.md`'s own worked example (`calculate_total` good / `calc_tot` bad) is contradicted by `src/orders.py`, which uses the "bad" name — the same fact underlying Backend's naming-convention finding. Resolved by the same rename fix above; no separate documentation edit needed once the code is renamed.

## Project-level observations
*(Orchestrator observations — project scope, assessed once across the full change set.)*

- **Process gap, not just a code gap:** this single commit adds a style guide, a function that violates it, a README that misdescribes that function, and a Dockerfile that duplicates a hardcoded secret from that same function — none of the four new files were cross-checked against each other before landing together. The individual fixes above are small, but the pattern (docs and code drifting apart within the *same* commit) is worth a lighter-weight gate going forward, e.g. a pre-merge check that new style-guide examples don't name-collide with real identifiers in the same diff.
- **`import os` is unused** in `src/orders.py` — it's present but nothing reads from `os.environ`, despite the module hardcoding a secret that should come from there. Its presence suggests environment-variable usage was intended but not finished.
- No coverage gaps in file matching: all four changed files (`Dockerfile`, `README.md`, `docs/python-style.md`, `src/orders.py`) were matched by at least one reviewer.
- No decision ledger is configured for this repo (`review.md` has no `decisions:` setting), so no findings were suppressed or bounded by prior team decisions.

## Fix plan by file

### `src/orders.py`
1. **[MAJOR][function]** Replace the bare `except:` in `calc_tot` with either no catch (let it raise) or a specific caught exception (`KeyError`/`TypeError`) that raises a domain-specific error — never silently return `0`. (Backend) — `src/orders.py:9` — guideline: `docs/python-style.md` § no bare except.
2. **[MAJOR][function]** Validate `discount_pct` is within `[0, 100]`; raise `ValueError` otherwise. (Backend) — `src/orders.py:5-9`.
3. **[CRITICAL][file]** Remove the hardcoded `API_KEY` constant; read it via `os.environ["API_KEY"]` instead. (DevOps, cross-file with Dockerfile finding below — fix together) — `src/orders.py:3`.
4. **[MINOR][function]** Rename `calc_tot` → `calculate_total` (do this once; see Cross-domain notes — also fixes the README's function-name finding and the style-guide contradiction). (Backend, Technical Writing) — `src/orders.py:5` — guideline: `docs/python-style.md` § naming.
5. **[MINOR][function]** Add type hints to `calculate_total`/`calc_tot` and `apply_tax`. (Backend) — `src/orders.py:5,12` — guideline: `docs/python-style.md` § type hints.
6. **[MINOR][function]** Validate `rate` in `apply_tax` (reject negative/absurd values). (Backend) — `src/orders.py:12-13`.
7. **[MINOR][function]** Validate `items` is a non-empty list of well-formed entries before summing, so failures are explicit rather than an unguarded `KeyError`/`TypeError` once the bare except is removed. (Backend) — `src/orders.py:6-8`.

### `Dockerfile`
1. **[CRITICAL][file]** Remove `ENV API_KEY=sk-live-9f8e7d6c5b4a`; inject the secret at runtime (`docker run -e`, Compose/orchestrator secret store) instead of baking it into the image. Fix together with `src/orders.py` item 3 above — removing only one side leaves the leak. (DevOps) — `Dockerfile:4`.
2. **[MAJOR][file]** Pin the base image (e.g. `FROM python:3.12.5-slim`) instead of floating on `python:latest`, to keep builds reproducible. (DevOps) — `Dockerfile:1`.
3. **[MINOR][file]** Add a `.dockerignore` (`.git`, `docs/`, `*.md`, caches, venvs) before `COPY . /app`, or copy only needed subpaths. (DevOps) — `Dockerfile:2`.
4. **[MINOR][file]** Switch to a slim base and add an explicit dependency-install stage (`COPY requirements.txt .` + `RUN pip install ...`) rather than relying on the full `python` image with no install step. (DevOps) — `Dockerfile:1-5`.
5. **[INFO][file]** Add a non-root `USER` before `CMD`. (DevOps) — `Dockerfile:1-5`.

### `README.md`
1. **[MAJOR][file]** Fix the documented function name/signature to match the actual code post-rename (`calculate_total(items, discount_pct)` — see Cross-domain notes) and state that `discount_pct` is a required caller-supplied argument, not automatic. (Technical Writing) — `README.md:5`.
2. **[MAJOR][file]** Remove/correct the "applied automatically by the server" claim — there is no server-side or automatic discount logic. (Technical Writing) — `README.md:5`.
3. **[MINOR][file]** Fix typo "automaticaly" → "automatically" (fold into the item-1 rewrite). (Technical Writing) — `README.md:5`.
4. **[INFO][file]** Add a minimal usage example showing the expected `items` shape and `discount_pct` units. (Technical Writing) — `README.md`.

### `docs/python-style.md`
No direct edit required — its naming-example contradiction with the codebase (module-scope finding) is resolved once `src/orders.py` item 4 (rename) lands; see Cross-domain notes.

## Positive observations
- `docs/python-style.md` is concise and each rule is concrete and checkable (type hints, snake_case with a real example, no bare `except:`) rather than vague guidance — a good template for future style-guide entries. (Technical Writing)
- The added functions are minimal in scope, which kept all three reviews fast and the findings well-anchored. (Backend, implicit)

## Appendix
- [Backend report](backend.md)
- [DevOps report](devops.md)
- [Technical Writing report](technical-writing.md)
