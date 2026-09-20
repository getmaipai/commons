# Core

Lint runs `tsc --noEmit && eslint src`; the workspace uses the recommended TypeScript ESLint rules and forbids product imports so its helpers remain product-agnostic.

## Pinning this workspace

A consumer adds `"@maipai/core": "file:../../shared/core"` to its `package.json` (adjusted for its own depth), checks out this repo at the tag it wants, and runs `bun install`; `bun` copies a self-contained package, so a bump is a new checkout plus `bun install`. The pinned tag is stated in the consumer's own dev docs and checked by its `check.sh` against this workspace's `package.json` version. There is no registry; this is the `@maipai/standards` pattern.

## Modules

| Module | What it is |
| --- | --- |
| `aesGcm` | Internal, used by `backupCrypto` and `secrets`, for the shared AES-256-GCM encrypt/decrypt primitive. |
| `archive` | Extracts downloaded engine archives into a stable destination directory while flattening their single release folder. |
| `backupCrypto` | Encrypts and decrypts backup files with AES-256-GCM and a dedicated keystore key. |
| `boundedMap` | Internal, used by `rateLimiter` and `secretThrottle`, for bounded maps that evict caller-proven stale entries before adding new ones. |
| `hardware` | Detects real machine hardware facts for sizing, autotuning, and determining what a box can run. |
| `hlc` | Implements the hybrid logical clock used for per-field last-writer-wins synchronization. |
| `id` | Generates cryptographically random base36 suffixes and the prefixed identifiers built from them. |
| `keystore` | Keeps at-rest encryption keys outside a product's database with platform-specific storage and protection. |
| `log` | Provides a rotating, best-effort logger that redacts registered secrets. |
| `openapi` | Provides shared Hono OpenAPI route scaffolding and reusable error response schemas. |
| `paths` | Creates owner-only data directories and reads file modification times safely. |
| `rateLimiter` | Provides a per-key token bucket that budgets third-party service traffic at a single choke point. |
| `secretThrottle` | Provides a generic brute-force throttle keyed by a client or device identifier to complement per-account lockout. |
| `secrets` | Provides reversible AES-256-GCM encryption for credentials with operator-set or keystore-managed keys. |
| `singleflight` | Shares one in-flight promise among concurrent callers and clears it when the attempt completes. |
| `ssrfGuard` | Rejects fetch targets resolving to private, loopback, or link-local addresses before making a request. |
| `withTimeout` | Races a promise against a timeout rejection and clears the timer in either outcome. |
| `zip` | Writes small dependency-free stored ZIP archives for text entries without compression. |
