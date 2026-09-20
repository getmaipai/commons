# shared: design record

Created 2026-09-20 out of
[`stack/docs/plans/refocus-work-order-2026-09-20.md`](https://github.com/getmaipai/stack/blob/main/docs/plans/refocus-work-order-2026-09-20.md)
steps 0b and 0c, itself following the same day's decision that the Stack is
no longer a product but Home's engine layer
([`stack-necessity-review-2026-09-20.md`](https://github.com/getmaipai/stack/blob/main/docs/plans/stack-necessity-review-2026-09-20.md)).
That refocus left two things worth keeping across the reshuffle: the
Stack's reconciled kit and shell from the 2026-09-19 UI reconciliation
(the owner's approved design), and the eight-plus helper files Home and
the Stack had each grown their own diverging copy of. Both needed one home
instead of two, and `home/spec` needed a home that isn't inside a single
product either, since the Stack, Catalog and Bot all read it. `shared` is
that home.

## Why one repo, not three

`ui`, `core` and `spec` differ in language and audience (`spec` is
TS-and-Python, `ui` is React-only, `core` is framework-agnostic TS), but
none needs its own release cadence, its own committer audience, or its own
visibility (org rule 5: "repos only when necessary"). They tag
independently (`ui-vX.Y.Z`, `core-vX.Y.Z`, `spec-vX.Y.Z`) inside one
checkout instead, the same way a consumer pins each workspace at its own
tag without needing three sibling clones.

Catalog stays its own repo: it is the one org repo that takes community
pull requests, on a different trust gate and cadence than everything else,
so it earns the separation `shared`'s own workspaces don't.

## Dependency direction

`shared` imports no product. `stack`, `home` and `catalog` import from
`shared`. `bot` gets `ui`, `core` and `spec` through Home's pinned runtime
package, and pins `spec` directly for its own Python body at the same
version Home pins. `go` pins `spec`. Reversing any of these arrows is a
bug: it would mean a library depending on the product it's meant to be
reused by.

## How a consumer pins a workspace

Mirrors `@maipai/standards` (`../.github/standards/README.md`, "Why
shell, not an npm package"): no registry, no publish step. A consumer
resolves the package from the sibling checkout, `MAIPAI_SHARED_DIR`
overriding `../shared`, and states the tag it targets (e.g. `core-v0.1.0`)
in its own dev docs and `package.json` dependency. Its `check.sh` fails
loud when the sibling is missing or the workspace's `package.json`
version doesn't match the stated pin, the same honesty-of-the-pin
contract the standards core already uses; nothing here verifies the tag
automatically.

`file:` vs `link:` is decided per the core-v0.1.0 tag message, on one
test: a consumer must end with exactly one React instance and one copy of
each `core` module, since a duplicated React breaks hooks across two
copies. That decision and its proof land in this file when core-v0.1.0
ships.

## Workspace status

- `ui/`: skeleton only (this commit). Content lands at `ui-v0.1.0`,
  extracted read-only from the Stack's committed tree at commit `5ec0f57`
  (the 2026-09-19 UI reconciliation), generalized to drop every import
  that only the Stack console needed, plus Home's `primitives/`,
  `schema/` and `settings/` (the ones that already render `@maipai/spec`'s
  declaration format), per the kit-placement plan in the session-b work
  order's ready report.
- `core/`: skeleton only (this commit). Content lands at `core-v0.1.0`:
  the eight files that exist in both `home/backend/src/lib` and
  `stack/backend/src/lib` today (`log`, `withTimeout`, `paths`, `archive`,
  `diagnostics`, `hardware`, `openapi`, `secretThrottle`), each taken from
  whichever side is better or rewritten, plus Home's `hlc`, `id`,
  `secrets`, `keystore`, `rateLimiter`, `singleflight`, `ssrfGuard` and
  backup crypto.
- `spec/`: not moved. A README points at `home/spec`, still the source of
  truth until `spec-v0.1.0` (step 0c) moves it here whole.

## Tooling

`scripts/check.sh` runs each populated workspace's own `lint` and `test`
scripts, then the pinned `@maipai/standards` core
(`std-v0.2.0`, `../.github` by default, `MAIPAI_STANDARDS_DIR` overrides).
No workspace here uses a separate formatter (`eslint`/`tsc` are the lint
step, matching every other `getmaipai` repo; none uses `prettier` as a
gate either, only as an occasional editor tool) so there's no separate
format-check command to wire in beyond that.
