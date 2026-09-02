# Review Results — Iteration 004

## Verdict
**REQUEST-CHANGES** — 2 CRITICAL findings survive dedup (the same live-looking secret hardcoded in two files), plus 5 MAJOR findings including a broken public API that the new README section documents incorrectly.

## Summary
- CRITICAL: 2 · MAJOR: 5 · MINOR: 3 · INFO: 1 (11 findings total, post-dedup)
- By reviewer: Backend 6, DevOps 4, Technical Writing 3 (one Backend finding and one Technical Writing finding are linked as a single ripple effect — see Cross-domain note 2 — but counted separately per report since they anchor to different files)

This iteration is unchanged in substance from iteration 003 — no code, docs, Dockerfile, or `review.md` content has moved since then — but is re-run fresh per policy. Two independent regressions in `src/orders.py` dominate: (1) a hardcoded live-looking API key that also leaked into the `Dockerfile`, and (2) a breaking, undocumented rename of the module's only public function (`calculate_total` → `calc_tot`, with a new required `discount_pct` parameter and no input validation) that immediately desynced the new README section describing it. The Dockerfile change adds further build-hygiene gaps (no `.dockerignore`, root user, no dependency-install layering) on top of the already-settled floating base-image tag. Decision D-002's revisit condition remains true and continues to await human re-evaluation.

## Cross-domain notes

1. **Shared root cause — same secret hardcoded twice.** Backend flagged `API_KEY = "sk-live-0000EXAMPLE0000"` in `src/orders.py:3` (unused constant, CRITICAL); DevOps flagged the identical value baked into `Dockerfile:4` via `ENV API_KEY=...` (CRITICAL). Both are the same credential leaking through two independent surfaces, and DevOps additionally notes the missing `.dockerignore` means the image also carries the full `.git` history (which contains this same secret in its diff) — multiplying the blast radius. A single upstream fix resolves both CRITICALs: remove the constant from `orders.py`, remove the `ENV` line from the `Dockerfile`, load the key from environment/secret-manager at runtime only, add a `.dockerignore`, and **rotate the key** — it must be treated as compromised regardless of which fix lands first, since it is already in git history on this branch.

2. **Ripple effect — API rename broke the docs, and the style guide already prescribes the fix.** Backend's INFO finding ("public function renamed/replaced without a migration path", `src/orders.py:5`) and Technical Writing's MAJOR finding ("documented function name does not exist in the codebase", `README.md:5`) are the same underlying event: `calculate_total(items)` was renamed to `calc_tot(items, discount_pct)` in the same change that added a README section still describing the old name and old signature. Notably, `docs/python-style.md` already names `calculate_total` as the *correct* form and calls out `calc_tot` by name as the disallowed abbreviation — so Backend's own MAJOR "banned abbreviation" finding, the README's outdated-but-correct name, and Technical Writing's broken-doc finding all point to the **same single fix**: rename the function back to `calculate_total` (adding `discount_pct: float` as a parameter, with input validation per Backend's third MAJOR finding), rather than fixing the code and docs in two unsynchronized passes.

3. **Coverage gap — no always-on security reviewer.** Both hardcoded-secret findings were only caught because the secret happened to land in files already matched by Backend's (`src/**`) and DevOps's (`Dockerfile*`) globs. A secret placed in a file matched by no reviewer (e.g. a `.env.example`, a YAML config, or a `.md` file) would currently pass through unreviewed. Recommend adding an `always: true` Security reviewer to `review.md`.

4. **Coverage gap — `review.md` itself is unmatched.** This iteration's diff includes a one-line addition to `review.md` (`- decisions: .reviewers/decisions/`) that is not matched by any reviewer's `files` glob. Low risk here since it's a self-explanatory settings addition, but changes to the review contract itself currently get zero review coverage.

5. **Process note — review/ledger artifacts are excluded from Technical Writing's scope, not silently missed.** The diff also contains `.reviews/001–003/*.md` (prior iterations' own output) and `.reviewers/decisions/D-001*.md`/`D-002*.md` (the ledger, consumed separately per the decision-ledger mechanism). These mechanically match Technical Writing's `**/*.md` glob but were deliberately excluded from that reviewer's assignment as orchestrator infrastructure rather than authored product documentation — consistent with iteration 003's scoping. Not a gap; noted for transparency.

## Project-level observations
*(Scope: project — orchestrator observations from the once-per-review pass, not attributable to any single domain reviewer.)*

- **Inconsistent error-handling posture across the two functions in `src/orders.py`.** `calc_tot` swallows all errors via bare `except: return 0` (tolerated under D-002, bounded to that function); `apply_tax`, added in the same diff, has no error handling at all and will raise an uncaught `TypeError`/produce silently wrong results on bad input (per Backend's MAJOR validation finding). One function silently lies about failure and its neighbor crashes loudly — the module has no consistent error contract for callers to rely on.
- **No test coverage anywhere in the repo.** There is no test file for `src/orders.py`; the discount/tax logic has at least two concrete silent-corruption edge cases (`discount_pct > 100`, negative `rate`) identified by Backend, none of which would need a human reviewer to catch if a couple of unit tests existed.
- **Feature and review-infrastructure changes remain mixed into the same commits.** As in iteration 003: prior `.reviews/00N/` output continues to be committed alongside unrelated source changes rather than in dedicated commits. Unchanged since last iteration; still worth a team decision (gitignore `.reviews/` vs. keep committing it separately).

## Settled by prior decisions

- **D-001** (floating `python:latest` base tag, bounds: Dockerfile at repo root) — correctly not re-raised by DevOps; the base-image state is unchanged and stays within bounds.
- **D-002** (bare `except:` in `calc_tot`, bounds: that function only) — correctly not re-raised by Backend for the existing bare-except itself; `apply_tax`'s complete absence of error handling was independently flagged (see Fix plan) since it doesn't reuse the tolerated pattern, it simply has none.
- **Revisit candidate: D-002 (unchanged from iteration 003, still unresolved).** Its `Revisit-when` condition is `docs/python-style.md exists in this repo` — this file has existed since before D-002 was written and both Backend and Technical Writing independently flagged this again this iteration. The condition still appears to have been satisfied from the outset, which suggests either it was meant to reference a different future state (e.g. style-guide *enforcement* tooling, not mere file existence) or the entry needs correction. Flagged again for a human to supersede D-002 or fix the condition — the orchestrator does not reopen decisions automatically, and repeating this note every iteration without action is a sign the decision needs owner attention.
- **Candidate decision (recurring, --auto run — not written to the ledger):** If the team intends to keep the `calc_tot`/required-`discount_pct` API permanently (rather than restoring `calculate_total` per Cross-domain note 2), that would be a candidate for a new decision entry binding Backend and Technical Writing, narrowly bounded to this function's name/signature, so it stops being re-raised each iteration. No such entry exists yet; this is a suggestion for a human to adopt, not an automatic settlement.

## Fix plan by file

### src/orders.py
- **[CRITICAL][file] Hardcoded live-looking API key** (Backend) — src/orders.py:3. Remove the `API_KEY` constant; load from environment/secret manager if actually needed; rotate the exposed key. See Cross-domain note 1 (paired with the identical secret in `Dockerfile`).
- **[MAJOR][function] Function name uses a banned abbreviation** (Backend) — src/orders.py:5. `docs/python-style.md`: "no abbreviations (e.g. `calculate_total`, not `calc_tot`)." Rename to `calculate_total` (or a fuller name) — see Cross-domain note 2, this also fixes the README mismatch.
- **[MAJOR][function] Missing type hints on `calc_tot` and `apply_tax`** (Backend) — src/orders.py:5,12. `docs/python-style.md`: "All functions must have type hints." Add `items: list[dict], discount_pct: float) -> float` and `total: float, rate: float) -> float`.
- **[MAJOR][function] No input validation on `discount_pct` / `rate`** (Backend) — src/orders.py:5-9,12-13. Add range checks (`0 <= discount_pct <= 100`, `rate >= 0`), raising `ValueError` on violation, per Backend's suggested snippet.
- **[MINOR][file] Unused `import os`** (Backend) — src/orders.py:1. Remove, or use it to source `API_KEY` from the environment as part of the CRITICAL fix above.
- **[INFO][module] Breaking rename with no migration path** (Backend) — src/orders.py:5. Superseded by the rename fix above (Cross-domain note 2); no separate action needed once `calculate_total` is restored.

### Dockerfile
- **[CRITICAL][function] Hardcoded live secret baked into image via `ENV`** (DevOps) — Dockerfile:4. Remove the `ENV API_KEY=...` line; inject at runtime (`docker run -e API_KEY=...`) or via an orchestrator secret store. See Cross-domain note 1.
- **[MAJOR][module] No `.dockerignore`; full build context copied into the image** (DevOps) — Dockerfile:2. Add a `.dockerignore` excluding `.git`, `.reviews`, `.reviewers`, `*.env` — this also reduces the blast radius of the CRITICAL finding above.
- **[MINOR][file] No non-root `USER` instruction** (DevOps) — Dockerfile (whole file). Add `RUN useradd -m appuser` / `USER appuser`.
- **[MINOR][file] Single monolithic layer, no dependency-install step** (DevOps) — Dockerfile (whole file). When a dependency manifest exists, copy and install it before copying the rest of the source for cache efficiency and reproducibility.

### README.md
- **[MAJOR][function] Documented function name does not exist in the codebase** (Technical Writing) — README.md:5. Update to reference the actual function once renamed (`calculate_total(items, discount_pct)` per the fix above), with a correct usage example.
- **[MAJOR][function] "applied automatically" contradicts the required `discount_pct` argument** (Technical Writing) — README.md:5. State explicitly that the caller supplies the discount percentage; do not describe it as automatic.
- **[MINOR][file] Typo: "automaticaly"** (Technical Writing) — README.md:5. Correct to "automatically" (may be superseded by the rewrite above).

## Positive observations
- Documenting the new discount capability in the README rather than leaving it silently undocumented is good practice and worth continuing (Technical Writing).

## Appendix
- [Backend report](backend.md)
- [DevOps report](devops.md)
- [Technical Writing report](technical-writing.md)
