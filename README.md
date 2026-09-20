# getmaipai/shared

The org's libraries: code every MaiPai product imports, published once and
pinned by tag rather than copied. Decided 2026-09-20 (see
[docs/dev.md](docs/dev.md)) when the Stack was refocused as Home's engine
layer and its reconciled kit, plus the helpers Home and the Stack had each
grown their own copy of, needed one home instead of two.

| Workspace | Package | Contents | Consumers |
|---|---|---|---|
| `ui/` | `@maipai/ui` | The kit, tokens, icons, shell, settings and permission renderers, the kit's ESLint config | Home, Go, catalog packages |
| `core/` | `@maipai/core` | Logging, timeouts, paths, archives, IDs, secrets and the keystore, rate limiting, the hardware probe, backup crypto | Home, Stack, Bot |
| `spec/` | `@maipai/spec` | The household's record shapes, schemas, the settings declaration format, the UI schema, errors, safety, streaming and voice | Home, Stack, Catalog, Bot, Go |

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
