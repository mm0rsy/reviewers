// Shared comment formatting/dedup logic used by both the GitHub and GitLab posting
// providers, so the two platforms produce visually consistent output and share the same
// idempotency scheme (a hidden marker hashed from the finding's identity).
"use strict";

import { createHash } from "node:crypto";

export function findingId(f) {
  return createHash("sha1")
    .update(`${f.reviewer}|${f.path}|${f.line}|${f.title}`)
    .digest("hex")
    .slice(0, 12);
}

export function marker(id) {
  return `<!-- reviewers-finding:${id} -->`;
}

// Identifies the single summary comment so re-runs update it in place instead of
// stacking a new one per run.
export const SUMMARY_MARKER = "<!-- reviewers-summary -->";

export function extractMarker(body) {
  const m = body?.match(/<!-- reviewers-finding:([a-f0-9]+) -->/);
  return m ? m[1] : null;
}

function severityEmoji(sev) {
  return { CRITICAL: "🔴", MAJOR: "🟠", MINOR: "🟡", INFO: "🔵" }[sev] ?? "";
}

export function inlineCommentBody(f, id) {
  const lines = [
    marker(id),
    `**[${f.severity}] ${f.title}** ${severityEmoji(f.severity)}`,
    "",
    f.body || "",
  ];
  if (f.guideline && f.guideline !== "reviewer judgment") {
    lines.push("", `*Guideline: ${f.guideline}*`);
  }
  lines.push("", `<sub>${f.reviewer} reviewer · scope: ${f.scope ?? "unknown"}</sub>`);
  return lines.join("\n");
}

export function summaryBody({ synthesis, findings, notInline, postedCount }) {
  let body = SUMMARY_MARKER + "\n";
  body += synthesis
    ? synthesis
    : `## Reviewers — ${findings.length} finding(s)\n\nNo synthesis file found; see individual reports.`;

  if (notInline.length > 0) {
    body += `\n\n---\n\n<details><summary>${notInline.length} finding(s) not anchored to a diff line</summary>\n\n`;
    for (const f of notInline) {
      body += `- **[${f.severity}]** ${f.file ?? "?"} — ${f.title} (${f.reviewer})\n`;
    }
    body += `\n</details>`;
  }
  body += `\n\n<sub>${postedCount} new inline comment(s) posted this run.</sub>`;
  return body;
}
