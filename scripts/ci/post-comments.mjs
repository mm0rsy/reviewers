#!/usr/bin/env node
// Posts a review iteration's findings to a GitHub PR or GitLab MR: one summary comment
// (the synthesis, verbatim) plus one inline comment per line-anchored finding. Idempotent —
// see comment-format.mjs's marker scheme: a finding already commented on a prior run of
// this PR/MR is skipped, so re-running the workflow on a new push doesn't re-notify
// reviewers of findings that are still open.
//
// Usage: node scripts/ci/post-comments.mjs <iteration-dir> [github|gitlab]
// Platform is auto-detected from GITHUB_ACTIONS / GITLAB_CI when not given explicitly.
"use strict";

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { collectFindings } from "./parse-findings.mjs";
import { summaryBody } from "./comment-format.mjs";
import * as github from "./providers/github.mjs";
import * as gitlab from "./providers/gitlab.mjs";

const [, , iterationDir, platformArg] = process.argv;

if (!iterationDir) {
  console.error("usage: post-comments.mjs <iteration-dir> [github|gitlab]");
  process.exit(2);
}

function detectPlatform() {
  if (platformArg) return platformArg;
  if (process.env.GITHUB_ACTIONS === "true") return "github";
  if (process.env.GITLAB_CI === "true") return "gitlab";
  throw new Error(
    "couldn't detect platform — pass github|gitlab explicitly, or run inside GitHub Actions/GitLab CI"
  );
}

const providers = { github, gitlab };

async function main() {
  const platform = detectPlatform();
  const provider = providers[platform];
  if (!provider) throw new Error(`unknown platform "${platform}" (expected github or gitlab)`);

  const env = provider.readEnv();
  const findings = collectFindings(iterationDir);

  const synthesisPath = join(iterationDir, "review-results.md");
  const synthesis = existsSync(synthesisPath) ? readFileSync(synthesisPath, "utf8") : null;

  const { notInline, postedCount } = await provider.postAll(env, { findings, synthesis });
  const body = summaryBody({ synthesis, findings, notInline, postedCount });
  await provider.postSummary(env, body);

  console.log(
    `[${platform}] posted ${postedCount} new inline comment(s), 1 summary comment (${findings.length} total findings)`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
