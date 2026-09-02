// Parses reviewer report files (core/reference/finding-format.md skeleton) into structured
// findings. Used by post-pr-comments.mjs and severity-gate.mjs — kept dependency-free so it
// runs under a bare `node` in CI with no npm install step.
"use strict";

import { readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";

const SEVERITIES = ["CRITICAL", "MAJOR", "MINOR", "INFO"];

// One report's ## Findings section, split into ### blocks.
export function parseReport(markdown, reviewerSlug) {
  const findingsSection = extractSection(markdown, "## Findings");
  if (!findingsSection) return [];

  const blocks = splitFindingBlocks(findingsSection);

  const findings = [];
  for (const block of blocks) {
    const headingMatch = block.match(/^### \[(\w+)\]\s*(.+)$/m);
    if (!headingMatch) continue;
    const [, rawSeverity, title] = headingMatch;
    const severity = rawSeverity.toUpperCase();
    if (!SEVERITIES.includes(severity)) continue;

    const fields = { File: null, Scope: null, Category: null, Guideline: null };
    for (const key of Object.keys(fields)) {
      const m = block.match(new RegExp(`^- ${key}:\\s*(.+)$`, "m"));
      if (m) fields[key] = m[1].trim();
    }

    const bodyStart = block.search(/\n\n/);
    const body = bodyStart >= 0 ? block.slice(bodyStart).trim() : "";

    const { path, line } = splitFileLine(fields.File);

    findings.push({
      reviewer: reviewerSlug,
      severity,
      title: title.trim(),
      file: fields.File,
      path,
      line,
      scope: fields.Scope,
      category: fields.Category,
      guideline: fields.Guideline,
      body,
    });
  }
  return findings;
}

function splitFileLine(fileField) {
  if (!fileField) return { path: null, line: null };
  const f = fileField.trim();
  if (f === "cross-file" || !f.includes(":")) return { path: f, line: null };
  const idx = f.lastIndexOf(":");
  const path = f.slice(0, idx);
  const rest = f.slice(idx + 1);
  const line = /^\d+$/.test(rest) ? Number(rest) : null;
  return { path, line: line ?? null };
}

// Headings inside fenced code blocks (e.g. a suggested-fix snippet containing "## Discounts")
// must not be mistaken for section/finding boundaries, so both this and the block splitter
// in parseReport track fence state line-by-line rather than using a single regex over the
// whole text.
function extractSection(markdown, heading) {
  const lines = markdown.split("\n");
  const startIdx = lines.findIndex((l) => l.trim() === heading);
  if (startIdx === -1) return null;
  let endIdx = lines.length;
  let inFence = false;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (/^```/.test(lines[i].trim())) inFence = !inFence;
    if (!inFence && /^## /.test(lines[i])) {
      endIdx = i;
      break;
    }
  }
  return lines.slice(startIdx, endIdx).join("\n");
}

function splitFindingBlocks(section) {
  const lines = section.split("\n");
  const blocks = [];
  let current = [];
  let inFence = false;
  for (const line of lines) {
    if (/^```/.test(line.trim())) inFence = !inFence;
    if (!inFence && /^### /.test(line) && current.length) {
      blocks.push(current.join("\n").trim());
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current.join("\n").trim());
  return blocks.filter((b) => b.startsWith("### "));
}

// Reads every reviewer report in an iteration dir (skips review-results.md — synthesis
// output isn't in the per-finding skeleton) and returns the combined finding list.
export function collectFindings(iterationDir) {
  const files = readdirSync(iterationDir).filter(
    (f) => f.endsWith(".md") && f !== "review-results.md"
  );
  const all = [];
  for (const f of files) {
    const slug = basename(f, ".md");
    const text = readFileSync(join(iterationDir, f), "utf8");
    all.push(...parseReport(text, slug));
  }
  return all;
}

export { SEVERITIES };
