// GitLab provider for post-comments.mjs — shells out to `glab api`, mirroring the github.mjs
// provider's use of `gh api`. Flag semantics verified against glab 1.116.0 hitting the real
// gitlab.com API: `--input -` reads the body from stdin, but unlike gh it sends NO
// Content-Type header, so GitLab rejects the request with HTTP 415 unless we pass
// `-H "Content-Type: application/json"` explicitly. The full posting flow against a live MR
// (auth'd POSTs landing as discussions) still needs an end-to-end smoke test.
//
// Env: CI_PROJECT_ID, CI_MERGE_REQUEST_IID (both set automatically by GitLab CI on
// merge-request pipelines). Auth: export GITLAB_TOKEN (project/group access token, API
// scope) — glab reads it itself; nothing here reads it directly. CI_JOB_TOKEN is not used
// because its permissions for writing MR discussions are inconsistent across GitLab
// versions/settings.
"use strict";

import { spawnSync } from "node:child_process";
import { findingId, extractMarker, inlineCommentBody, SUMMARY_MARKER } from "../comment-format.mjs";

export function readEnv() {
  const { CI_PROJECT_ID, CI_MERGE_REQUEST_IID } = process.env;
  if (!CI_PROJECT_ID || !CI_MERGE_REQUEST_IID) {
    throw new Error("gitlab provider needs CI_PROJECT_ID and CI_MERGE_REQUEST_IID");
  }
  return { projectId: CI_PROJECT_ID, mrIid: CI_MERGE_REQUEST_IID };
}

function glabApi(path, { method, jsonBody } = {}) {
  // Deliberately doesn't use glab's --paginate/--slurp flags — their exact output framing
  // couldn't be verified without the CLI installed locally. Pagination is done manually
  // below via the `page` query param instead, so each call here returns exactly one JSON
  // value from a single response body, parsed the same safe way regardless of pretty-print.
  const args = ["api", path];
  if (method) args.push("--method", method);
  // glab doesn't set a Content-Type for --input bodies (gh does) — without the explicit
  // header GitLab responds HTTP 415 "provided content-type '' is not supported".
  if (jsonBody) args.push("--input", "-", "-H", "Content-Type: application/json");
  const res = spawnSync("glab", args, {
    input: jsonBody ? JSON.stringify(jsonBody) : undefined,
    encoding: "utf8",
  });
  if (res.status !== 0) {
    // res.error covers the binary-missing case (status is null, stderr empty).
    const detail = res.error?.message || res.stderr || res.stdout;
    const err = new Error(`glab ${args.join(" ")} failed: ${detail}`);
    err.status = res.status;
    throw err;
  }
  return res.stdout.trim() ? JSON.parse(res.stdout) : null;
}

export async function postAll({ projectId, mrIid }, { findings }) {
  const mr = glabApi(`projects/${projectId}/merge_requests/${mrIid}`);
  const diffRefs = mr.diff_refs; // { base_sha, start_sha, head_sha }

  const inlineable = findings.filter((f) => f.path && f.line);
  const unanchored = findings.filter((f) => !(f.path && f.line));

  const posted = new Set();
  for (let page = 1; ; page++) {
    const discussions = glabApi(
      `projects/${projectId}/merge_requests/${mrIid}/discussions?per_page=100&page=${page}`
    );
    for (const d of discussions ?? []) {
      for (const note of d.notes ?? []) {
        const id = extractMarker(note.body);
        if (id) posted.add(id);
      }
    }
    if (!discussions || discussions.length < 100) break;
  }

  let postedCount = 0;
  const failed = [];
  for (const f of inlineable) {
    const id = findingId(f);
    if (posted.has(id)) continue;
    try {
      glabApi(`projects/${projectId}/merge_requests/${mrIid}/discussions`, {
        method: "POST",
        jsonBody: {
          body: inlineCommentBody(f, id),
          position: {
            position_type: "text",
            base_sha: diffRefs.base_sha,
            start_sha: diffRefs.start_sha,
            head_sha: diffRefs.head_sha,
            new_path: f.path,
            new_line: f.line,
          },
        },
      });
      postedCount++;
    } catch (e) {
      // Typically the line isn't part of the diff — folded into the summary comment
      // instead, but log why so a systemic failure (bad token, etc.) is visible.
      console.warn(`inline comment failed for ${f.path}:${f.line} — ${e.message}`);
      failed.push(f);
    }
  }

  return { notInline: [...unanchored, ...failed], postedCount };
}

export async function postSummary({ projectId, mrIid }, body) {
  // Update the previous run's summary note in place (found via SUMMARY_MARKER) instead of
  // stacking a new note per run.
  let existingId = null;
  for (let page = 1; ; page++) {
    const notes = glabApi(
      `projects/${projectId}/merge_requests/${mrIid}/notes?per_page=100&page=${page}`
    );
    for (const n of notes ?? []) {
      if (n.body?.includes(SUMMARY_MARKER)) existingId = n.id;
    }
    if (!notes || notes.length < 100) break;
  }

  if (existingId) {
    glabApi(`projects/${projectId}/merge_requests/${mrIid}/notes/${existingId}`, {
      method: "PUT",
      jsonBody: { body },
    });
  } else {
    glabApi(`projects/${projectId}/merge_requests/${mrIid}/notes`, {
      method: "POST",
      jsonBody: { body },
    });
  }
}
