# Changelog (`@maipai/ui`)

All notable changes to the `ui` workspace. Format follows
[Keep a Changelog](https://keepachangelog.com); versions follow semver,
tagged `ui-vX.Y.Z`. Everything stays `0.x` until Home's adoption proves it.

## [0.1.1] - ui-v0.1.1

### Fixed
- `docs/UI.md`'s 48px touch-target and 16px type floors, ported from
  Home's own hardened kit copy into the primitives that came through the
  Stack path unhardened: `button`, `input`, `checkbox`, `select`,
  `tabs`, `dropdown-menu`, `command`, `dialog`, `sheet`, `toggle`,
  `label`, `table`, `breadcrumb`, and `sidebar`'s menu button. The kit's
  `switch`, `slider` and `sidebar` rail already carried this fix, which
  made the gap a half-merge rather than a design choice. See
  `../docs/dev.md` for the file-by-file inventory and the reasoning kept
  out (Home's own visual language stays in Home). `docs/spec.md` section
  7 gets a one-line note that its own smaller hit-target numbers predate
  this floor.

## [0.1.0] - ui-v0.1.0

### Added
- The kit, extracted from the Stack's reconciled kit (commit `5ec0f57`)
  and Home's `primitives/`, `schema/` and `settings/`: layout
  primitives, tokens, icons, the settings and UI-schema renderers, and
  a new `Shell.tsx` (rail, phone nav, header slots, the Cmd/Ctrl+K
  command palette), `HeaderPicker` and `NotificationPopover` chrome
  primitives, `AppearanceControl`, and a generic `http.ts` fetch client.
  The approved design specification lives at `docs/spec.md` with its six
  reference images at `docs/reference/`. See `../docs/dev.md` for the
  full inventory of what each piece replaced and why.
