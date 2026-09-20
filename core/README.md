# Core

Lint runs `tsc --noEmit && eslint src`; the workspace uses the recommended TypeScript ESLint rules and forbids product imports so its helpers remain product-agnostic.

## Pinning this workspace

A consumer adds `"@maipai/core": "file:../../shared/core"` to its `package.json` (adjusted for its own depth), checks out this repo at the tag it wants, and runs `bun install`; `bun` copies a self-contained package, so a bump is a new checkout plus `bun install`. The pinned tag is stated in the consumer's own dev docs and checked by its `check.sh` against this workspace's `package.json` version. There is no registry; this is the `@maipai/standards` pattern.
