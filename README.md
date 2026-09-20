# getmaipai/commons

The org's libraries: code every MaiPai product imports, published once and
pinned by tag rather than copied. Decided 2026-09-20 (see
[docs/dev.md](docs/dev.md)) when the Stack was refocused as Home's engine
layer and its reconciled kit, plus the helpers Home and the Stack had each
grown their own copy of, needed one home instead of two.

Public (2026-09-20): every product (`home`, `stack`, `bot`, `go`) and every
`catalog` package pins a tag here, no credential required. The repo was named
`shared` until 2026-09-20; the old address redirects.

## Workspaces and their current tags

| Workspace | Package | Current tag | Consumers |
|---|---|---|---|
| `ui/` | `@maipai/ui` | `ui-v0.4.0` | Home (Go and catalog packages later) |
| `core/` | `@maipai/core` | `core-v0.1.0` | Home, Stack |
| `spec/` | `@maipai/spec` | `spec-v0.1.2` | Home, Stack, Catalog (Bot and Go later) |

A consumer pins one of these tags and states it in its own dev docs. Bumping is two edits in the consumer: the tag in its
`scripts/check.sh` and the matching `file:` path in its
`package.json`, then `bun install --force`; the consumer's gate calls
`scripts/ensure-tag.sh <workspace> <tag>` here, which creates a read-only
worktree of that tag beside this checkout the first time and reuses it after
(the `@maipai/standards` pattern, no registry).

Nothing in `commons` imports a product. A consuming repo resolves each
workspace from the per-tag worktree, never from this working checkout
(`MAIPAI_COMMONS_DIR` tells a consumer where this repo is; the default is the
sibling folder); see [docs/dev.md](docs/dev.md) for the pin mechanics,
SHARED-PIN-01, and why there is no registry.

Org standards apply and are auto-loaded from the parent directory
`CLAUDE.md` (source: [getmaipai/.github](https://github.com/getmaipai/.github)).

`bash scripts/check.sh` from the repo root is the pre-commit gate: each
workspace's own lint and tests, then the pinned `@maipai/standards` core.

License: AGPL-3.0, see [LICENSE](LICENSE). MaiPai is open-source software
for personal, self-hosted, non-commercial use by you and your household;
it is not affiliated with, endorsed by, or sponsored by any platform it
can connect to; all product names and trademarks belong to their
respective owners; you are responsible for complying with the terms and
laws that apply to you and the services you access.
