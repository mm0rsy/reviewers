## D-002 — Bare except tolerated in calc_tot (2026-09-01)
- Decision: The bare `except:` returning 0 inside `calc_tot` stays until the error-model rework.
- Rationale: Callers depend on the 0 sentinel; changing it is scheduled with the error-model rework. Origin: review 002, [MAJOR] bare except.
- Binds: Backend
- Bounds: the `calc_tot` function in src/orders.py only — new code must not copy this pattern
- Revisit-when: docs/python-style.md exists in this repo
