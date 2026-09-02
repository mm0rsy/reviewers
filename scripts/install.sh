#!/usr/bin/env bash
# Install the reviewers plugin surfaces into a project (or globally where supported).
#
# Usage: scripts/install.sh --opencode|--antigravity|--claude|--copilot|--all
#                           [--global] [--link] [TARGET_DIR]
#
#   --opencode     copy adapters/opencode  -> TARGET/.opencode/   (--global: ~/.config/opencode/)
#   --antigravity  copy adapters/antigravity -> TARGET/.agents/
#   --claude       print native marketplace install instructions
#   --copilot      print native marketplace install instructions
#   --link         symlink instead of copy (auto-updates with this clone; not for teammates)
#   TARGET_DIR     project to install into (default: current directory)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DO_OPENCODE=false DO_ANTIGRAVITY=false DO_CLAUDE=false DO_COPILOT=false
GLOBAL=false LINK=false TARGET=""

for arg in "$@"; do
  case "$arg" in
    --opencode) DO_OPENCODE=true ;;
    --antigravity) DO_ANTIGRAVITY=true ;;
    --claude) DO_CLAUDE=true ;;
    --copilot) DO_COPILOT=true ;;
    --all) DO_OPENCODE=true; DO_ANTIGRAVITY=true; DO_CLAUDE=true; DO_COPILOT=true ;;
    --global) GLOBAL=true ;;
    --link) LINK=true ;;
    -h|--help) grep '^#' "$0" | grep -v '^#!' | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*) echo "unknown flag: $arg" >&2; exit 2 ;;
    *) TARGET="$arg" ;;
  esac
done

if ! $DO_OPENCODE && ! $DO_ANTIGRAVITY && ! $DO_CLAUDE && ! $DO_COPILOT; then
  echo "pick at least one of --opencode --antigravity --claude --copilot --all (see --help)" >&2
  exit 2
fi
TARGET="${TARGET:-$PWD}"

place() { # place <src_dir> <dest_dir>
  local src="$1" dest="$2"
  mkdir -p "$(dirname "$dest")"
  if $LINK; then
    [[ -e "$dest" && ! -L "$dest" ]] && { echo "refusing to replace non-symlink $dest" >&2; exit 1; }
    ln -sfn "$src" "$dest"
  else
    mkdir -p "$dest"
    cp -R "$src/." "$dest/"
  fi
  echo "installed: $dest"
}

if $DO_OPENCODE; then
  base="$TARGET/.opencode"
  $GLOBAL && base="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
  place "$ROOT/adapters/opencode/commands/reviewers" "$base/commands/reviewers"
  place "$ROOT/adapters/opencode/skills/review-orchestration" "$base/skills/review-orchestration"
  echo "openCode: commands available as /reviewers/full-review and /reviewers/init"
fi

if $DO_ANTIGRAVITY; then
  if $GLOBAL; then
    echo "Antigravity global install isn't scripted (managed by the IDE); installing per-project instead." >&2
  fi
  base="$TARGET/.agents"
  place "$ROOT/adapters/antigravity/workflows" "$base/workflows"
  place "$ROOT/adapters/antigravity/skills/review-orchestration" "$base/skills/review-orchestration"
  echo "Antigravity: trigger with /reviewers-full-review and /reviewers-init"
fi

if $DO_CLAUDE; then
  cat <<EOF
Claude Code installs natively from this repo (no file copying needed):
  /plugin marketplace add $ROOT     (or: /plugin marketplace add mm0rsy/reviewers)
  /plugin install reviewers@reviewers-marketplace
Commands: /reviewers:full-review, /reviewers:init
EOF
fi

if $DO_COPILOT; then
  cat <<EOF
GitHub Copilot CLI installs natively from this repo's marketplace:
  copilot plugin marketplace add mm0rsy/reviewers
  copilot plugin install reviewers@reviewers-marketplace
EOF
fi
