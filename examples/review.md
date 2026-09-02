# Review Configuration

## Settings
- output: .reviews/
- base: main
- decisions: .reviewers/decisions/

## Reviewer: Backend
- files: src/**, **/*.py
- guidelines: docs/python-style.md
- focus: error handling, correctness, input validation

## Reviewer: DevOps
- files: Dockerfile*, .github/workflows/**
- focus: reproducible builds, secret handling, image hygiene

## Reviewer: Technical Writing
- files: **/*.md, docs/**
- focus: accuracy against the code, clarity
