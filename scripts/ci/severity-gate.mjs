#!/usr/bin/env node
// Fails CI when findings at or above a severity threshold exist in a review iteration.
//
// Usage: node scripts/ci/severity-gate.mjs <iteration-dir> [fail-on]
//   iteration-dir  .reviews/<NNN>/ (or wherever the run's `output` setting points)
//   fail-on        critical (default) | major | minor | none — none always exits 0
//
// Env: REVIEWERS_FAIL_ON overrides the fail-on argument (workflow `with:` input wiring).
"use strict";

import { collectFindings, SEVERITIES } from "./parse-findings.mjs";

const [, , iterationDir, failOnArg] = process.argv;
const failOn = (process.env.REVIEWERS_FAIL_ON || failOnArg || "critical").toUpperCase();

if (!iterationDir) {
  console.error("usage: severity-gate.mjs <iteration-dir> [fail-on]");
  process.exit(2);
}

if (failOn === "NONE") {
  console.log("severity gate: fail-on=none, skipping");
  process.exit(0);
}
if (!SEVERITIES.includes(failOn)) {
  console.error(`severity gate: unknown fail-on level "${failOn}" (expected one of ${SEVERITIES.join(", ")}, or none)`);
  process.exit(2);
}

const findings = collectFindings(iterationDir);

const counts = Object.fromEntries(SEVERITIES.map((s) => [s, 0]));
for (const f of findings) counts[f.severity] = (counts[f.severity] ?? 0) + 1;

console.log("Findings by severity:");
for (const s of SEVERITIES) console.log(`  ${s}: ${counts[s]}`);

// Gate trips on the configured level and anything more severe (CRITICAL > MAJOR > MINOR > INFO).
const gateIdx = SEVERITIES.indexOf(failOn);
const blocking = findings.filter((f) => SEVERITIES.indexOf(f.severity) <= gateIdx);

if (blocking.length > 0) {
  console.error(`\nseverity gate: ${blocking.length} finding(s) at or above ${failOn} — failing`);
  for (const f of blocking) {
    console.error(`  [${f.severity}] ${f.file ?? "?"} — ${f.title} (${f.reviewer})`);
  }
  process.exit(1);
}

console.log(`\nseverity gate: no findings at or above ${failOn} — passing`);
process.exit(0);
