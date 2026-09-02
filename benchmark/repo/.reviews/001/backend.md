# Backend — Review 001

- Files reviewed: 1 (src/orders.py)
- Base: main (merge-base with feature/discounts)
- Guidelines applied: docs/python-style.md
- Verdict: REQUEST-CHANGES

## Findings

### [MAJOR] Bare `except:` silently swallows all errors and returns a wrong total
- File: src/orders.py:9
- Scope: function
- Category: error-handling
- Guideline: docs/python-style.md § "Never use bare `except:`; catch specific exceptions."

`calc_tot` wraps the entire calculation in a bare `except:` that returns `0` for any failure, including `KeyError` (missing `"price"`/`"qty"`), `TypeError` (non-numeric price/qty), or `ZeroDivisionError`-adjacent surprises. This hides bugs and malformed input instead of surfacing them.

**Why it matters:** An order with one malformed line item (e.g. a missing `"qty"` key from an upstream bug) will silently compute a total of `0` instead of raising, so a customer could be charged nothing, or the failure could go completely unnoticed in logs/monitoring — a correctness bug disguised as success.

**Suggested fix:**
```python
def calculate_total(items: list[dict], discount_pct: float) -> float:
    total = sum(i["price"] * i["qty"] for i in items)
    return total - total * discount_pct / 100
```
Let the caller decide how to handle malformed input (or catch a specific exception like `KeyError`/`TypeError` and raise a domain-specific error), rather than masking it as a valid `0` total.

### [MAJOR] No validation of `discount_pct` allows negative totals or discounts that increase the price
- File: src/orders.py:5-9
- Scope: function
- Category: validation

`calc_tot` accepts any `discount_pct` value with no bounds checking. A negative value increases the total (a "discount" that charges more), and a value greater than 100 produces a negative total.

**Why it matters:** A caller passing an out-of-range percentage (e.g. from a malformed coupon record or a user-supplied value) silently produces a negative or inflated total instead of failing fast, which can lead to undercharging/overcharging customers.

**Suggested fix:**
```python
if not 0 <= discount_pct <= 100:
    raise ValueError(f"discount_pct must be between 0 and 100, got {discount_pct}")
```

### [MINOR] `apply_tax` has no validation for negative or absurd tax rates
- File: src/orders.py:12-13
- Scope: function
- Category: validation

`apply_tax` performs no bounds checking on `rate`; a negative rate silently reduces the total, and there's no protection against non-numeric input.

**Why it matters:** A negative or corrupted `rate` value (e.g. from a bad config or unit mismatch such as `7` instead of `0.07`) would silently produce an incorrect total rather than failing loudly.

**Suggested fix:** Validate `rate >= 0` (and consider an upper sanity bound) before applying it, raising `ValueError` on violation.

### [MINOR] Function name `calc_tot` violates naming convention
- File: src/orders.py:5
- Scope: function
- Category: naming-convention
- Guideline: docs/python-style.md § "Function names use snake_case; no abbreviations (e.g. `calculate_total`, not `calc_tot`)."

The guideline explicitly calls out `calc_tot` as the counter-example to avoid, and this is exactly the name used.

**Why it matters:** Reduces readability and consistency across the codebase; the guideline gives this exact case as the negative example.

**Suggested fix:** Rename to `calculate_total`.

### [MINOR] Missing type hints on both functions
- File: src/orders.py:5, src/orders.py:12
- Scope: function
- Category: style
- Guideline: docs/python-style.md § "All functions must have type hints."

Neither `calc_tot` nor `apply_tax` declare parameter or return type hints.

**Why it matters:** Violates the team's binding style guideline and loses the benefit of static type checking / IDE assistance for a money-handling code path where type errors (e.g. passing a `str` rate) are especially costly.

**Suggested fix:**
```python
def calculate_total(items: list[dict[str, float]], discount_pct: float) -> float:
    ...

def apply_tax(total: float, rate: float) -> float:
    ...
```

### [MINOR] No validation that `items` is non-empty or well-formed before computing total
- File: src/orders.py:6-8
- Scope: function
- Category: validation

There is no check that `items` is a non-empty list of dicts each containing numeric `"price"` and `"qty"`. Malformed entries currently fall through into the bare `except` (see finding above) and return `0` instead of a clear validation error.

**Why it matters:** Once the bare `except:` is removed (per the error-handling finding), an unvalidated malformed `items` list will raise an unguarded `KeyError`/`TypeError` deep in a generator expression, which is harder to diagnose than an explicit upfront validation error.

**Suggested fix:** Validate shape upfront, e.g. raise `ValueError` if `items` is empty, or check each item has numeric `price`/`qty` before summing.

## Positive observations
None — the added functions are minimal, so there is no notable positive pattern to highlight beyond their simplicity.

## Out-of-scope notes
- src/orders.py:3 — a hardcoded API key (`API_KEY = "sk-live-9f8e7d6c5b4a"`) is present in this new module. This is a security concern outside this review's domain (error handling/correctness/validation); flagging for the security reviewer's attention. Scope: file.
