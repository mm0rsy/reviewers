## D-001 — Floating `latest` base image tag accepted (2026-09-01)
- Decision: The Dockerfile may use the `python:latest` style floating base tag; we do not pin digests here.
- Rationale: This service is rebuilt nightly and we intentionally track upstream patches; pinning caused stale-CVE images. Origin: review 001, [MAJOR] base image tag.
- Binds: DevOps
- Bounds: Dockerfile at repo root only
- Revisit-when: never

