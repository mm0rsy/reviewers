#!/usr/bin/env bash
# Regenerate all platform surfaces from the canonical core/.
# Generated (do not hand-edit): commands/, skills/review-orchestration/references/, adapters/.
# Usage: scripts/sync.sh [--check]   (--check: fail if committed output differs from core)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HEADERS="$ROOT/scripts/headers"
CHECK_MODE=false
[[ "${1:-}" == "--check" ]] && CHECK_MODE=true

OUT="$ROOT"
if $CHECK_MODE; then
  OUT="$(mktemp -d)"
  trap 'rm -rf "$OUT"' EXIT
  mkdir -p "$OUT/skills/review-orchestration"
  cp "$ROOT/skills/review-orchestration/SKILL.md" "$OUT/skills/review-orchestration/SKILL.md"
fi

# body <src> <ref_dir> <args_note> -> stdout: body with placeholders substituted
render_body() {
  local src="$1" ref_dir="$2" args_repl="$3"
  sed -e "s|{{REF_DIR}}|$ref_dir|g" -e "s|\\\$ARGUMENTS|$args_repl|g" "$src"
}

gen() { # gen <header> <body> <ref_dir> <args_repl> <dest>
  local header="$1" body="$2" ref_dir="$3" args_repl="$4" dest="$5"
  mkdir -p "$(dirname "$dest")"
  { cat "$header"; echo; render_body "$body" "$ref_dir" "$args_repl"; } > "$dest"
}

copy_refs() { # copy_refs <dest_skill_dir>
  local dest="$1"
  mkdir -p "$dest/references/templates"
  cp "$ROOT"/core/reference/*.md "$dest/references/"
  cp "$ROOT"/core/templates/*.md "$dest/references/templates/"
}

FR="$ROOT/core/bodies/full-review.md"
IN="$ROOT/core/bodies/init.md"
EX="$ROOT/core/bodies/extend.md"

# --- Claude Code + Copilot CLI (shared plugin format) ---
CC_REF='${CLAUDE_PLUGIN_ROOT}/skills/review-orchestration/references'
gen "$HEADERS/claude-full-review.md" "$FR" "$CC_REF" '$ARGUMENTS' "$OUT/commands/full-review.md"
gen "$HEADERS/claude-init.md"        "$IN" "$CC_REF" '$ARGUMENTS' "$OUT/commands/init.md"
gen "$HEADERS/claude-extend.md"      "$EX" "$CC_REF" '$ARGUMENTS' "$OUT/commands/extend.md"
copy_refs "$OUT/skills/review-orchestration"

# --- openCode ---
OC_REF='.opencode/skills/review-orchestration/references'
gen "$HEADERS/opencode-full-review.md" "$FR" "$OC_REF" '$ARGUMENTS' "$OUT/adapters/opencode/commands/reviewers/full-review.md"
gen "$HEADERS/opencode-init.md"        "$IN" "$OC_REF" '$ARGUMENTS' "$OUT/adapters/opencode/commands/reviewers/init.md"
gen "$HEADERS/opencode-extend.md"      "$EX" "$OC_REF" '$ARGUMENTS' "$OUT/adapters/opencode/commands/reviewers/extend.md"
mkdir -p "$OUT/adapters/opencode/skills/review-orchestration"
cp "$ROOT/skills/review-orchestration/SKILL.md" "$OUT/adapters/opencode/skills/review-orchestration/"
copy_refs "$OUT/adapters/opencode/skills/review-orchestration"

# --- Antigravity ---
AG_REF='.agents/skills/review-orchestration/references'
AG_ARGS='the text the user typed after the workflow name'
gen "$HEADERS/antigravity-full-review.md" "$FR" "$AG_REF" "$AG_ARGS" "$OUT/adapters/antigravity/workflows/reviewers-full-review.md"
gen "$HEADERS/antigravity-init.md"        "$IN" "$AG_REF" "$AG_ARGS" "$OUT/adapters/antigravity/workflows/reviewers-init.md"
gen "$HEADERS/antigravity-extend.md"      "$EX" "$AG_REF" "$AG_ARGS" "$OUT/adapters/antigravity/workflows/reviewers-extend.md"
mkdir -p "$OUT/adapters/antigravity/skills/review-orchestration"
cp "$ROOT/skills/review-orchestration/SKILL.md" "$OUT/adapters/antigravity/skills/review-orchestration/"
copy_refs "$OUT/adapters/antigravity/skills/review-orchestration"

if $CHECK_MODE; then
  fail=0
  for rel in commands skills/review-orchestration/references adapters; do
    if ! diff -ru "$ROOT/$rel" "$OUT/$rel" >/dev/null 2>&1; then
      echo "DRIFT: $rel differs from what core/ generates" >&2
      diff -ru "$ROOT/$rel" "$OUT/$rel" >&2 || true
      fail=1
    fi
  done
  [[ $fail -eq 0 ]] && echo "sync check: clean" || exit 1
else
  echo "sync: regenerated commands/, skill references, and adapters from core/"
fi
