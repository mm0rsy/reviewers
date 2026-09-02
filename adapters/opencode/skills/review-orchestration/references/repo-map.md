# Repository map — structural context for reviewers that judge shape

Some findings are impossible to reach from a diff alone. "This import points the wrong way,"
"this logic belongs one layer down," "this duplicates the module next door" all require knowing
what the repository *looks like* — which the reviewer prompt otherwise never says. The repo map
supplies exactly that, and nothing else.

It is opt-in per reviewer (`repo-map: true`; see `review-schema.md`), because most reviewers
don't need it: a technical-writing or embedded reviewer judging changed files gains nothing from
a directory listing but pays for it in prompt size. Architecture reviewers are the main
audience — the template enables it by default.

## Building it

Build the map **once per review**, only when at least one active reviewer requests it, and give
every such reviewer the same map. Derive it from tracked files so ignored, vendored, and
generated content disappears for free:

```bash
git ls-files | sed 's|[^/]*$||; s|/$||; s|^$|(root)|' | cut -d/ -f1-3 | sort | uniq -c | sort -rn
```

That strips each filename, truncates to depth 3, and counts — yielding tracked-file counts per
directory, with root-level files grouped as `(root)`. Strip the filename *before* truncating:
cutting the path directly would leave files that sit at exactly depth 3 (`src/api/orders.py`)
masquerading as directories in the map. Then:

- **Prune noise** that is tracked anyway: `node_modules/`, `vendor/`, `dist/`, `build/`,
  `target/`, `.venv/`, `__pycache__/`, minified bundles, lockfiles, snapshot/fixture dumps.
- **Mark the change set.** Every directory containing a changed file gets a `←` marker and the
  count of files changed in it. This is the map's highest-value signal: it shows *where in the
  structure* the change lands and which boundaries it straddles.
- **List root-level manifests and entry points** (`package.json`, `pyproject.toml`, `go.mod`,
  `Dockerfile`, `main.*`, `cmd/`, `src/index.*`) — they tell the reviewer how the thing is
  built and where it starts.
- **Name each directory's role** in a few words when it is evident from its contents; leave it
  blank rather than guessing. A wrong label is worse than no label.

Keep the whole map under roughly 60 lines. If the repo is larger, collapse depth 3 into
`(N subdirectories)` summaries and keep depth 1–2 complete — breadth beats depth here, since
the point is boundaries, not contents.

## Optional: dependency edges the change introduces

When it is cheap for the language at hand — a grep of `import`/`require`/`#include`/`use`
lines in the changed files — also list cross-module dependencies the diff *adds*, as
`from <module> → to <module>`. This is the single most useful input for judging dependency
direction, and it is the difference between "I can see the layers" and "I can see the change
violating them."

Do not attempt a full dependency graph, and do not attempt this at all for languages where
imports are dynamic or resolution is non-obvious. State plainly in the map when it was skipped,
rather than implying a clean result.

## Example

```markdown
## Repository map
Tracked files by area (depth 3, ignored/vendored pruned). `←` marks directories touched by this change.

- src/api/            42 files   HTTP handlers, request validation      ← 3 changed
- src/services/       31 files   business logic
- src/db/             18 files   repositories, migrations               ← 1 changed
- src/shared/          9 files   cross-cutting helpers
- tests/unit/         57 files
- tests/integration/  12 files
- docs/adr/           14 files   architecture decision records
Root: pyproject.toml, Dockerfile, src/main.py (entry point)

New cross-module dependencies introduced by this change:
- src/api/orders.py → src/db (direct repository import, bypassing src/services)
```

## What the map is not

It is context for judging the change, **not** a license to review the rest of the repository.
The reviewer's findings must still be anchored in the assigned changed files, and the scope
ladder still stops at the reviewer's configured `depth` — project-wide judgments remain the
synthesis step's job, once per review (`synthesis.md` Step 2). A reviewer that starts reporting
on untouched directories because it can now see them has misused the map: the correct output
there is a finding about the change's *relationship* to those directories, not about their
contents.
