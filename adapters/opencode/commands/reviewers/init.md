---
description: Inspect the repo and interview the team to scaffold a review.md review contract
---

# Init — scaffold the team's review.md

Create a `review.md` review contract for this repository by inspecting the stack and
interviewing the user. Reference documents:
- `.opencode/skills/review-orchestration/references/review-schema.md` — the format you must produce
- `.opencode/skills/review-orchestration/references/templates/` — starter reviewer sections per domain

Arguments given by the user: `$ARGUMENTS` (treat as hints about the stack or desired reviewers).

## Step 1 — Guard
If `review.md` or `.reviewers/review.md` already exists, show its current roster and ask
whether to extend it or stop. Never overwrite silently.

## Step 2 — Inspect the repository
Detect the stack cheaply (listings and manifest files, not full reads):
- Languages: file extensions across the repo (top ~6 by count).
- Ecosystems: pyproject.toml/setup.py, package.json, go.mod, Cargo.toml, pom.xml/build.gradle,
  CMakeLists.txt/Makefile, *.csproj, Gemfile…
- Infra: Dockerfile*, docker-compose*, .github/workflows/, .gitlab-ci.yml, Jenkinsfile,
  terraform/ansible/helm files.
- Docs: docs/ directory, README size, *.rst/*.md volume.
- Tests: test/tests directories, test frameworks in manifests.
- Existing conventions: CONTRIBUTING.md, style guides, lint configs (.eslintrc, ruff/flake8,
  .clang-format, .editorconfig) — these are candidate `guidelines:` links.

## Step 3 — Propose a roster
Map findings to domain templates from `.opencode/skills/review-orchestration/references/templates/` (backend, frontend, devops,
embedded, testing, technical-writing, python-packaging, security, validation, architecture).
Propose only domains with evidence in the repo, plus Security (always: true) by default;
offer Architecture (always: true, project-wide) for multi-module repos. Ignore `_`-prefixed
files in templates/ (meta-templates, not domains). For a detected technology with no
matching template (e.g. CAPL, Go, Rust), mention that `/reviewers:extend <domain>` builds
a proper reviewer for it with the user. Show the proposed
roster with the globs and guideline links you inferred.

## Step 4 — Interview
Ask the user (briefly, in one round if possible):
- Which proposed reviewers to keep/drop, and any missing domains.
- Where their coding guidelines / naming convention docs live (offer the candidates found in
  step 2), noting that linked guideline content is enforced verbatim during reviews.
- Whether reviews should be committed or ignored (offer to add `.reviews/` to .gitignore).
- Whether to enable the **decision ledger** (`decisions: docs/review-decisions.md` — see
  `.opencode/skills/review-orchestration/references/decision-ledger.md`): a committed file of settled review decisions that stops
  re-litigating them and enforces their bounds. Recommend it; if accepted, create the file
  with a short header comment and no entries.

## Step 5 — Write review.md
Assemble the file at the repository root: a `## Settings` section plus one `## Reviewer:`
section per confirmed domain, based on the templates but with globs and guidelines adapted
to this repo. Follow `review-schema.md` exactly. Then show the result and remind the user:
- review.md is meant to be committed — it is the team's shared review contract.
- `/reviewers:full-review` runs the review; `--auto` skips confirmation.
- Editing review.md (adding domains, linking new guideline docs) needs no plugin changes.
