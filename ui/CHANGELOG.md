# Changelog (`@maipai/ui`)

All notable changes to the `ui` workspace. Format follows
[Keep a Changelog](https://keepachangelog.com); versions follow semver,
tagged `ui-vX.Y.Z`. Everything stays `0.x` until Home's adoption proves it.

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
