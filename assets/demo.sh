#!/usr/bin/env bash
# Replay of a real `/reviewers:full-review --auto` run (sample repo, iteration 004).
# All review content shown is verbatim model output; only the pacing is scripted.

G=$'\033[32m'; C=$'\033[36m'; Y=$'\033[33m'; R=$'\033[31m'; B=$'\033[1m'
D=$'\033[2m'; M=$'\033[35m'; N=$'\033[0m'

type_cmd() { # fake prompt + char-by-char typing
  printf "%s❯%s " "$G" "$N"
  local s="$1" i
  for ((i=0; i<${#s}; i++)); do printf '%s' "${s:$i:1}"; sleep 0.035; done
  printf '\n'; sleep 0.4
}
say() { printf '%b\n' "$1"; }

type_cmd "cat review.md"
sleep 0.2
say "${D}# Review Configuration${N}"
say ""
say "${B}## Settings${N}"
say "- output: .reviews/"
say "- decisions: ${C}.reviewers/decisions/${N}    ${D}# settled-decision ledger${N}"
say ""
say "${B}## Reviewer: Backend${N}"
say "- files: src/**, **/*.py"
say "- guidelines: docs/python-style.md"
say "- focus: error handling, correctness, input validation"
say ""
say "${B}## Reviewer: DevOps${N}"
say "- files: Dockerfile*, .github/workflows/**"
say "- focus: reproducible builds, secret handling, image hygiene"
say ""
say "${B}## Reviewer: Technical Writing${N}"
say "- files: **/*.md, docs/**"
say "- focus: accuracy against the code, clarity"
sleep 2.6
echo

type_cmd "claude \"/reviewers:full-review --auto\""
sleep 0.7
say "${D}Parsing review.md … roster composed from the contract${N}"
sleep 0.9
say ""
say "${B}Active reviewers${N} (globs matched against the change set):"
say "  ${C}Backend${N}            src/orders.py"
say "  ${C}DevOps${N}             Dockerfile"
say "  ${C}Technical Writing${N}  README.md"
say "${D}Decision ledger: 2 entries loaded (D-001, D-002)${N}"
sleep 1.8
say ""
say "Dispatching 3 reviewers in parallel → .reviews/004/"
for r in "backend" "devops" "technical-writing"; do
  sleep 1.1
  say "  ${G}✓${N} ${r}.md"
done
sleep 0.6
say "Synthesizing cross-domain results …"
sleep 1.6
echo
say "${B}## Verdict${N}"
say "${R}${B}REQUEST-CHANGES${N} — 2 CRITICAL findings survive dedup (the same live-looking"
say "secret hardcoded in two files), plus 5 MAJOR findings including a broken"
say "public API that the new README section documents incorrectly."
sleep 2.4
say ""
say "${B}## Cross-domain notes${N}"
say "1. ${B}Shared root cause — same secret hardcoded twice.${N} Backend flagged"
say "   API_KEY in ${C}src/orders.py:3${N}; DevOps flagged the identical value baked"
say "   into ${C}Dockerfile:4${N}. A single upstream fix resolves both CRITICALs —"
say "   and ${B}rotate the key${N}: it is already in git history."
sleep 2.6
say "2. ${B}Ripple effect — API rename broke the docs.${N} Backend's banned-abbreviation"
say "   finding and Technical Writing's broken-doc finding point to the ${B}same${N}"
say "   ${B}single fix${N}: restore calculate_total, not two unsynchronized passes."
sleep 2.6
say ""
say "${B}## Settled by prior decisions${N}"
say "- ${M}D-001${N} (floating python:latest tag) — correctly ${B}not re-raised${N}: within bounds."
say "- ${M}D-002${N} revisit condition met — flagged for a human; decisions are never"
say "  reopened automatically."
sleep 2.8
say ""
say "${G}Full report:${N} .reviews/004/review-results.md ${D}(fix plan grouped by file)${N}"
sleep 3.5
