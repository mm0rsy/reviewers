# Backend — Review 004

- Files reviewed: 1 (src/orders.py)
- Base: main (merge-base with HEAD)
- Guidelines applied: docs/python-style.md
- Verdict: REQUEST-CHANGES

## Findings

### [MAJOR] Missing type hints on both new/changed functions
- File: src/orders.py:5, src/orders.py:12
- Scope: function
- Category: style
- Guideline: docs/python-style.md § "All functions must have type hints."

`calc_tot(items, discount_pct)` and `apply_tax(total, rate)` have no parameter or return type hints. The function they replaced (`calculate_total`) previously had `list[dict] -> float` annotations, so this is a regression, not just an omission.

**Why it matters:** Callers and static tooling (mypy, IDEs) lose the ability to catch type errors (e.g. passing a string `discount_pct`) before runtime; the bare `except` then masks the resulting failure by returning 0.

**Suggested fix:**
```python
def calc_tot(items: list[dict], discount_pct: float) -> float:
    ...

def apply_tax(total: float, rate: float) -> float:
    ...
```

### [MAJOR] Function name uses a banned abbreviation
- File: src/orders.py:5
- Scope: function
- Category: naming-convention
- Guideline: docs/python-style.md § "Function names use snake_case; no abbreviations (e.g. `calculate_total`, not `calc_tot`)."

The new function is literally named `calc_tot`, which is the exact abbreviation the style guide calls out by name as disallowed. The diff also deletes the previous, correctly-named `calculate_total`.

**Why it matters:** This is the guideline's canonical counter-example; keeping the name as-is signals the rule isn't enforced and invites further abbreviated names elsewhere.

**Suggested fix:** Rename to `calculate_total` (and update the discount behavior/signature accordingly) or, if the discount variant must stay distinct from a future rework, use a full name such as `calculate_discounted_total`.

### [MAJOR] No input validation on discount_pct / rate allows silently wrong totals
- File: src/orders.py:5-9, src/orders.py:12-13
- Scope: function
- Category: validation

Neither `calc_tot` nor `apply_tax` validates its numeric argument. `calc_tot` with `discount_pct > 100` (e.g. 150) produces a negative total; `apply_tax` with a negative `rate` silently reduces the total instead of taxing it, and there's no guard against a caller passing a percentage (e.g. `8`) where a fraction (`0.08`) was intended.

**Why it matters:** These are order/money calculations — a bad discount or tax value flows straight into a charged amount with no error raised, which is a correctness risk that will not surface until someone notices an incorrect invoice.

**Suggested fix:**
```python
def calc_tot(items: list[dict], discount_pct: float) -> float:
    if not 0 <= discount_pct <= 100:
        raise ValueError(f"discount_pct must be in [0, 100], got {discount_pct}")
    ...

def apply_tax(total: float, rate: float) -> float:
    if rate < 0:
        raise ValueError(f"rate must be non-negative, got {rate}")
    ...
```

### [CRITICAL] Hardcoded live API key committed to source
- File: src/orders.py:3
- Scope: file
- Category: security

`API_KEY = "sk-live-0000EXAMPLE0000"` is a live-looking secret added directly to the module and is now in git history. It is also unused anywhere in the file (dead alongside being a leak).

**Why it matters:** Anyone with repo access (or anyone who later forks/open-sources the repo) can extract and use this key; rotating it after the fact does not remove it from history.

**Suggested fix:** Remove the constant, load the key from an environment variable or secrets manager (`os.environ["API_KEY"]`) at the point of use, and rotate the exposed key immediately.

### [MINOR] Unused import
- File: src/orders.py:1
- Scope: file
- Category: other

`import os` is added but never referenced anywhere in the file.

**Why it matters:** Dead imports add noise and can mislead readers into thinking `os` is used (e.g. for env-based config) when it isn't — relevant here since the API key above should actually be sourced via `os.environ`.

**Suggested fix:** Either remove the unused import, or use it as intended to read `API_KEY` from the environment (see finding above).

### [INFO] Public function renamed/replaced without a migration path
- File: src/orders.py:5
- Scope: module
- Category: api-contract

`calculate_total(items: list[dict]) -> float` is removed entirely and replaced by `calc_tot(items, discount_pct)`, which has a different name, a different (mandatory, unvalidated) signature, and different behavior (applies a discount). No other file in the repo currently imports either name, so nothing breaks today, but this is a silent breaking rename of what was the module's only public function.

**Why it matters:** Any external caller or future module added later that imports `calculate_total` will break with an `ImportError` instead of a clear deprecation signal.

**Suggested fix:** If the discount behavior is meant to replace the old function, consider keeping `calculate_total` as a thin wrapper (`discount_pct=0`) or documenting the rename in a changelog until call sites are confirmed migrated.

## Positive observations
None beyond what's noted above — the diff is small; no practice here is worth propagating as-is.

## Out-of-scope notes
- [function] The pre-existing bare `except:` in `calc_tot` returning 0 is covered by decisions D-002 and intentionally not raised here. Note for orchestrator synthesis: D-002's `Revisit-when` condition ("docs/python-style.md exists in this repo") appears to now be met, since docs/python-style.md is present in this review's repo — flagging for the decision owner to re-evaluate, not reopening it myself.
