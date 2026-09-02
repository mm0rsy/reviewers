# DevOps — Review 001

- Files reviewed: 1 (Dockerfile)
- Base: merge-base with main, branch feature/discounts
- Guidelines applied: none
- Verdict: REQUEST-CHANGES

## Findings

### [CRITICAL] Live API key hardcoded and baked into the image
- File: Dockerfile:4
- Scope: file
- Category: security

`ENV API_KEY=sk-live-9f8e7d6c5b4a` embeds what looks like a live secret directly into the image layers and into the container's environment for any process/user with shell or `docker inspect` access. This duplicates (and permanently freezes into the image) the same secret hardcoded in `src/orders.py`.

**Why it matters:** Anyone who can pull the image, run `docker history`/`docker inspect`, or exec into the container can extract the key. Because it's an `ENV` layer, it remains recoverable even if a later layer overwrites or unsets it, and it will leak into any registry the image is pushed to (including public ones by accident). A live key baked into a distributable artifact is a guaranteed credential-leak / immediate revoke-and-rotate incident.

**Suggested fix:**
Remove the `ENV API_KEY=...` line entirely. Inject the secret at runtime instead (e.g., `docker run -e API_KEY=... `, Docker/Compose secrets, or an orchestrator's secret store), and have `src/orders.py` read it from the environment rather than hardcoding it (see cross-reference finding below, out of this file's scope to fix).

### [MAJOR] Unpinned base image breaks reproducible builds
- File: Dockerfile:1
- Scope: file
- Category: build-packaging

`FROM python:latest` floats to whatever the current `latest` tag resolves to at build time, which changes over time (Python minor/major version bumps, OS package updates).

**Why it matters:** Two builds from the identical Dockerfile on different days can produce different Python versions and different OS package sets, causing "works on my machine" drift, unreproducible CI builds, and surprise breakage when `latest` rolls to a new major version.

**Suggested fix:**
Pin to a specific tag (and ideally a digest), e.g.:
```
FROM python:3.12.5-slim
```

### [MINOR] No unneeded-file exclusion before COPY
- File: Dockerfile:2
- Scope: file
- Category: build-packaging

`COPY . /app` copies the entire build context — including `.git`, `docs/`, `README.md`, `review.md`, and any local venv/cache directories — into the image with no `.dockerignore` present in the repo to limit it.

**Why it matters:** Bloats image size, slows builds (larger context sent to the daemon), invalidates Docker layer cache more often than necessary, and risks copying local secrets/credentials or `.git` history into the shipped image.

**Suggested fix:**
Add a `.dockerignore` file excluding `.git`, `docs/`, `*.md`, `__pycache__/`, `.venv/`, etc., and/or copy only the needed subpaths (e.g., `COPY src/ /app/src/`, `COPY requirements.txt .`).

### [MINOR] Full python image instead of slim, and no dependency installation step
- File: Dockerfile:1-5
- Scope: file
- Category: image-hygiene / build-packaging

The image uses the full `python` base (large, includes build toolchains and OS packages not needed at runtime) and there is no explicit dependency-install step (no `requirements.txt`/`pip install`, no multi-stage build), so any runtime dependencies of `src/orders.py` would have to already be present in the base image or are missing entirely.

**Why it matters:** Larger attack surface and image size than necessary; if `orders.py` has any third-party dependencies, the container will fail at runtime with `ModuleNotFoundError` since nothing installs them.

**Suggested fix:**
Use a slim/distroless base and add an explicit dependency install stage, e.g.:
```
FROM python:3.12.5-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY src/ /app/src/
CMD ["python", "src/orders.py"]
```

### [INFO] Container runs as root by default
- File: Dockerfile:1-5
- Scope: file
- Category: security

No `USER` instruction is present, so the process runs as root inside the container (default for the `python` base image).

**Why it matters:** Running as root increases blast radius if the application or a dependency is compromised (e.g., container-breakout primitives are more impactful with root inside the container).

**Suggested fix:**
Create and switch to a non-root user, e.g.:
```
RUN useradd -m appuser
USER appuser
```

## Positive observations
None — this is a minimal first-pass Dockerfile; no notable practices worth propagating yet.

## Out-of-scope notes
- `src/orders.py:3` hardcodes the same live-looking API key as a module-level constant (`API_KEY = "sk-live-9f8e7d6c5b4a"`), which is the root cause the `ENV` line in the Dockerfile is propagating. Scope: cross-file. Fixing the Dockerfile alone (removing the `ENV`) is necessary but not sufficient — the app code itself must also stop hardcoding the secret and instead read it from `os.environ`. This is flagged here only for cross-reference; the actual code fix is out of this reviewer's assigned-file scope.
