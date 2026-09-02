// GitHub provider for post-comments.mjs — shells out to `gh api` rather than hand-rolling
// HTTP+auth, matching the `gh`/`glab` dependency full-review.md already has for diff
// fetching (step 3). This also gets GHES (`GH_HOST`) support for free.
//
// Env: GITHUB_REPOSITORY (owner/repo), PR_NUMBER. Auth: gh reads GH_TOKEN/GITHUB_TOKEN
// itself — export one of those in the job so `gh` is authenticated; nothing here reads it
// directly.
"use strict";

import { spawnSync } from "node:child_process";
import { findingId, extractMarker, inlineCommentBody } from "../comment-format.mjs";

export function readEnv() {
  const { GITHUB_REPOSITORY, PR_NUMBER } = process.env;
  if (!GITHUB_REPOSITORY || !PR_NUMBER) {
    throw new Error("github provider needs GITHUB_REPOSITORY (owner/repo) and PR_NUMBER");
  }
  const [owner, repo] = GITHUB_REPOSITORY.split("/");
  return { owner, repo, prNumber: PR_NUMBER };
}

function ghApi(path, { method, jsonBody, paginateSlurp } = {}) {
  const args = ["api", path];
  if (method) args.push("--method", method);
  if (paginateSlurp) args.push("--paginate", "--slurp");
  if (jsonBody) args.push("--input", "-");
  const res = spawnSync("gh", args, {
    input: jsonBody ? JSON.stringify(jsonBody) : undefined,
    encoding: "utf8",
  });
  if (res.status !== 0) {
    const err = new Error(`gh ${args.join(" ")} failed: ${res.stderr || res.stdout}`);
    err.status = res.status;
    throw err;
  }
  return res.stdout.trim() ? JSON.parse(res.stdout) : null;
}

export async function postAll({ owner, repo, prNumber }, { findings }) {
  const pr = ghApi(`repos/${owner}/${repo}/pulls/${prNumber}`);
  const commitId = pr.head.sha;

  const inlineable = findings.filter((f) => f.path && f.line);
  const unanchored = findings.filter((f) => !(f.path && f.line));

  // --slurp wraps each page's array response as an element of an outer array — flatten it.
  const pages =
    ghApi(`repos/${owner}/${repo}/pulls/${prNumber}/comments?per_page=100`, {
      paginateSlurp: true,
    }) ?? [];
  const posted = new Set();
  for (const page of pages) {
    for (const c of page) {
      const id = extractMarker(c.body);
      if (id) posted.add(id);
    }
  }

  let postedCount = 0;
  const failed = [];
  for (const f of inlineable) {
    const id = findingId(f);
    if (posted.has(id)) continue;
    try {
      ghApi(`repos/${owner}/${repo}/pulls/${prNumber}/comments`, {
        method: "POST",
        jsonBody: {
          body: inlineCommentBody(f, id),
          commit_id: commitId,
          path: f.path,
          line: f.line,
          side: "RIGHT",
        },
      });
      postedCount++;
    } catch {
      // Line isn't part of the diff hunk — folded into the summary comment instead.
      failed.push(f);
    }
  }

  return { notInline: [...unanchored, ...failed], postedCount };
}

export async function postSummary({ owner, repo, prNumber }, body) {
  ghApi(`repos/${owner}/${repo}/issues/${prNumber}/comments`, {
    method: "POST",
    jsonBody: { body },
  });
}
