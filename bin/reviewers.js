#!/usr/bin/env node
// npx reviewers --opencode [--global] [--link] [target-dir]
// Thin wrapper around scripts/install.sh so openCode/Antigravity users can
// install without cloning. Claude Code / Copilot users don't need this —
// the marketplace one-liners in the README install natively.
"use strict";

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const installSh = path.join(__dirname, "..", "scripts", "install.sh");
const args = process.argv.slice(2);

// Bare `npx reviewers` should orient, not error out.
if (args.length === 0) args.push("--help");

const result = spawnSync("bash", [installSh, ...args], { stdio: "inherit" });

if (result.error) {
  if (result.error.code === "ENOENT") {
    console.error("reviewers: bash not found on PATH — install.sh needs a POSIX shell.");
    console.error("On Windows, run this from Git Bash or WSL.");
  } else {
    console.error(`reviewers: failed to run installer: ${result.error.message}`);
  }
  process.exit(1);
}

process.exit(result.status ?? 1);
