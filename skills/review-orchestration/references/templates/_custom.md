<!--
META-TEMPLATE — the minimal reference for authoring a NEW domain reviewer
(any language/technology not shipped as a built-in template: CAPL, Go, Rust, VHDL, …).
Files starting with "_" are meta-templates: never proposed as domains by /reviewers:init.
Used by /reviewers:extend as the skeleton it fills in WITH the user. Every part below can
be extended by the team as needed — this is a floor, not a ceiling.
-->

## Reviewer: <Domain Name>
<!-- files: every glob where this technology lives in THIS repo. Verify each glob actually
     matches files before committing; wrong globs = reviewer never activates. -->
- files: <globs, comma-separated>
<!-- guidelines: repo-relative docs whose content is enforced VERBATIM during review.
     Prefer one starter doc per domain (e.g. docs/<domain>-guidelines.md) containing:
     naming conventions, forbidden constructs, required patterns, tooling rules.
     /reviewers:extend can draft this doc with you. -->
- guidelines: <paths, comma-separated>
<!-- focus: 4-7 areas, ordered by priority, SPECIFIC to the technology's real failure
     modes — not generic ("code quality") but concrete ("unchecked CAN signal timeouts",
     "goroutine leaks on early return", "unwrap() outside tests"). -->
- focus: <area 1>, <area 2>, <area 3>
<!-- Optional keys: always: true (run on every review) · severity-floor: minor ·
     depth: domain (override the global scope-ladder depth) -->

<!-- Free-form prose below the bullets is passed to the reviewer verbatim. Use it for
     constraints the keys can't express: target hardware, protocol versions, legacy
     zones to ignore, links between this domain and others. -->
<Optional domain lore, one short paragraph.>
