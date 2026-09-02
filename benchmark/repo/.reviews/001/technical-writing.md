# Technical Writing — Review 001

- Files reviewed: 2 (README.md, docs/python-style.md)
- Base: merge-base with main, branch feature/discounts
- Guidelines applied: none
- Verdict: REQUEST-CHANGES

## Findings

### [MAJOR] README documents a function name that does not exist
- File: README.md:5
- Scope: file
- Category: documentation
- Guideline: reviewer judgment

README.md instructs users to "Use `calculate_total(items)` to get totals," but the actual function defined in `src/orders.py` is `calc_tot(items, discount_pct)` — a different name and a different signature (it also requires a `discount_pct` argument that the README omits entirely).

**Why it matters:** A reader following the README will call a function that doesn't exist (`calculate_total`) and get a `NameError`/`ImportError`, or will miss the required `discount_pct` argument and get a `TypeError`. This is the single most load-bearing sentence in the document and it is factually wrong.

**Suggested fix:**
```markdown
## Discounts
Use `calc_tot(items, discount_pct)` to get totals. Callers must pass the
discount percentage explicitly (0 for no discount) — it is not applied
automatically.
```

### [MAJOR] README misstates how discounts are applied
- File: README.md:5
- Scope: file
- Category: documentation
- Guideline: reviewer judgment

The README claims "discounts are applied automaticaly by the server," but `calc_tot` has no server-side or automatic discount logic — the caller must pass `discount_pct` explicitly as an argument, and if omitted the call fails (no default value is defined for that parameter).

**Why it matters:** This sets an incorrect mental model for integrators: they will assume they can call the function with just `items` and get a discounted total "for free," rather than realizing they own the responsibility of supplying and validating the discount percentage. That gap surfaces as a runtime error or, worse, a silently wrong total if someone works around it by guessing a default.

**Suggested fix:**
State explicitly that the discount percentage is a required, caller-supplied parameter and describe its expected range/units (e.g., "10" for 10%, not "0.10").

### [MINOR] Typo: "automaticaly"
- File: README.md:5
- Scope: file
- Category: style
- Guideline: reviewer judgment

"automaticaly" is missing an "l" (should be "automatically"). This is compounded by the fact that the surrounding claim is also inaccurate (see above findings).

**Why it matters:** Minor, but typos in a five-line README undermine confidence in the rest of the document's accuracy — especially since the sentence containing the typo is also the one that's factually wrong.

**Suggested fix:**
Fix the spelling once the sentence's content is corrected.

### [MINOR] Style guide's own naming example is contradicted by the real codebase
- File: docs/python-style.md:3
- Scope: module
- Category: documentation
- Guideline: reviewer judgment

`docs/python-style.md` uses `calculate_total` / `calc_tot` as its worked example of "good name vs. bad abbreviation," but the actual function in `src/orders.py` (the very module this repo is about) is named `calc_tot` — i.e., the codebase uses the "bad" example name the style guide warns against, and README.md independently invents the "good" name (`calculate_total`) as if it were real. The two new docs disagree with each other and with the code on what the function is actually called.

**Why it matters:** Readers cross-referencing the README and the style guide will reasonably conclude the function was recently renamed from `calc_tot` to `calculate_total` to comply with the style guide — which hasn't happened. This creates confusion about which name is current and whether the style guide is aspirational or already enforced.

**Suggested fix:**
Either (a) note in the style guide that `calc_tot` is a real pre-existing violation slated for rename, or (b) pick a naming example that isn't the exact identifier used elsewhere in the same PR's documentation, to avoid implying a rename that didn't happen.

### [INFO] README lacks basic setup/usage context
- File: README.md
- Scope: file
- Category: documentation
- Guideline: reviewer judgment

The README jumps straight to a single API usage line with no install/run instructions, import path, or example of a full call (e.g., what an `items` element looks like).

**Why it matters:** A new contributor cannot get from "clone repo" to "successfully call this function" using only this document; they'd have to read the source to learn the expected shape of `items` (dicts with `price`/`qty` keys) and the units for `discount_pct`.

**Suggested fix:**
Add a minimal usage example, e.g.:
```python
from src.orders import calc_tot

items = [{"price": 10.0, "qty": 2}]
total = calc_tot(items, discount_pct=10)  # 10 = 10% off
```

## Positive observations
`docs/python-style.md` is admirably concise and each rule is concrete and checkable (type hints, snake_case with a real example, no bare `except:`) rather than vague guidance — worth using as the template for future style-guide entries.

## Out-of-scope notes
- Scope: function — `src/orders.py:9` uses a bare `except:` that swallows all errors and returns `0`, which directly violates the new `docs/python-style.md:4` rule the moment it's introduced; not a documentation-file defect but worth flagging since the docs and code landed in the same change set.
- Scope: function — `src/orders.py:5` has no type hints on `calc_tot`, violating `docs/python-style.md:2`, again a code-side gap rather than a doc-file defect.
