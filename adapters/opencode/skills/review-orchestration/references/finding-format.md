# Standard Finding Format

Every reviewer report (`.reviews/<NNN>/<reviewer-slug>.md`) uses this exact structure so the
synthesis step can merge reports mechanically and humans can scan any report the same way.

## Report skeleton

```markdown
# <Reviewer Name> — Review <NNN>

- Files reviewed: <n> (<list or count>)
- Base: <diff base used>
- Guidelines applied: <paths, or "none">
- Verdict: APPROVE | APPROVE-WITH-COMMENTS | REQUEST-CHANGES

## Findings

### [<SEVERITY>] <short title>
- File: <path>:<line>            (or <path> for file-level, or "cross-file")
- Scope: <one of the scope levels below>
- Category: <one of the categories below>
- Guideline: <guideline doc § or "reviewer judgment">

<What is wrong — one or two sentences, concrete.>

**Why it matters:** <consequence / failure scenario>

**Suggested fix:**
<concrete change, with a code snippet when short>

## Positive observations
<optional: practices worth propagating to the team — this is how best practices spread>
```

## Scope levels

Every finding names the altitude at which the problem lives — this is how multi-level review
stays organized and filterable:

| Scope      | The problem is in…                                                              |
|------------|----------------------------------------------------------------------------------|
| `function` | the logic of one function/method (wrong result, missing case, bad error path).  |
| `file`     | one file as a whole (structure, cohesion, file-level naming, dead code).        |
| `module`   | how the change sits in its module/package (duplication of an existing helper, inconsistent API shape, naming that breaks module conventions). |
| `domain`   | the change's fit within the reviewer's domain across the repo (violates the domain's architecture, contract, or established pattern). |
| `project`  | overall-project concerns (cross-module architecture drift, repo-wide consistency). Reserved for the synthesis step and dedicated always-on reviewers such as Architecture. |

## Severity levels

| Level      | Meaning                                                                  |
|------------|--------------------------------------------------------------------------|
| `CRITICAL` | Breaks correctness, security, or data integrity. Must fix before merge.  |
| `MAJOR`    | Real defect or guideline violation with user-visible/maintenance impact. |
| `MINOR`    | Guideline/convention deviation, small quality issue.                     |
| `INFO`     | Observation, suggestion, or question. Never blocks.                      |

Use EXACTLY these four labels. Never substitute other scales (no HIGH/MEDIUM/LOW,
no BLOCKER/NIT) — mechanical merging during synthesis depends on these names.

## Categories

`correctness`, `security`, `performance`, `api-contract`, `error-handling`, `concurrency`,
`memory-safety`, `naming-convention`, `style`, `documentation`, `test-coverage`,
`build-packaging`, `deployment`, `accessibility`, `validation`, `other`.

## Rules for reviewers

1. Every finding must be anchored: a file (and line where possible) from the change set —
   `module`/`domain` findings anchor to the changed file that creates or worsens the problem.
   Pre-existing problems discovered while reading surrounding context go under a final
   `## Out-of-scope notes` section: brief, scope-labeled, max ~5 entries.
2. Report the finding against the guideline that mandates it when one applies — cite the
   document and section. Judgment calls say `reviewer judgment`.
3. No vague findings ("consider improving error handling"): state the failing input/state or
   the violated rule.
4. Reviewers **never modify code**. Output is the report file only.
5. An empty `## Findings` section with verdict `APPROVE` is a valid, good outcome. Do not
   invent findings to appear thorough.
