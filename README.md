# getmaipai/shared

The org's libraries: code every MaiPai product imports, published once and
pinned by tag rather than copied. Decided 2026-09-20 (see
[docs/dev.md](docs/dev.md)) when the Stack was refocused as Home's engine
layer and its reconciled kit, plus the helpers Home and the Stack had each
grown their own copy of, needed one home instead of two.

## Workspaces and their current tags

| Workspace | Package | Current tag | Consumers |
|---|---|---|---|
| `ui/` | `@maipai/ui` | `ui-v0.2.4` | Home (Go and catalog packages later) |
| `core/` | `@maipai/core` | `core-v0.1.0` | Home, Stack |
| `spec/` | `@maipai/spec` | `spec-v0.1.0` | Home, Stack, Catalog, Bot, Go |

A consumer pins one of these tags and states it in its own dev docs; bumping is
a checkout of the sibling at the new tag plus `bun install` (the
`@maipai/standards` pattern, no registry).

Nothing in `shared` imports a product. A consuming repo resolves each
workspace from a sibling checkout (`MAIPAI_SHARED_DIR` overrides
`../shared`) and states the tag it pins in its own dev docs; see
[docs/dev.md](docs/dev.md) for the pin mechanics and why there is no
registry.

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
