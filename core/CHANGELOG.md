# Changelog (`@maipai/core`)

All notable changes to the `core` workspace. Format follows
[Keep a Changelog](https://keepachangelog.com); versions follow semver,
tagged `core-vX.Y.Z`. Everything stays `0.x` until Home's and the Stack's
adoption proves it.

## [0.1.2] - core-v0.1.2

### Fixed
- `ssrfGuard`: reject NAT64, 6to4, unspecified, multicast and reserved
  destinations, and pin validated DNS answers to the actual connection;
  re-check every redirect hop with a bounded limit.

## [0.1.1] - core-v0.1.1

### Added
- `dataLocation`: the bootstrap record and the folder marker of home's
  DATA-LOCATION design, validated against `@maipai/spec`'s `DataLocation`
  and `DataFolder` (`spec-v0.1.58`). `dataLocationPath(product, options)`
  (`~/.maipai/<product>/data-location.json`, `%LOCALAPPDATA%\MaiPai\<product>\`
  on Windows, `MAIPAI_DATA_LOCATION_PATH` overrides), `readDataLocation` and
  `writeDataLocation` (atomic: temp file, fsync, rename, fsync of the folder;
  an invalid record is refused and nothing is written), `isRecordOwnedBy`,
  `classGeneration`; class path resolution `resolveClassPath` (override, or
  root plus default subpath, or the root's parent for `beside-root`) and
  `resolveClassLocation` (`MAIPAI_DATA_DIR`, then the record, then the
  default, with the source named), `dataDirFromEnv`; markers
  `readFolderMarker`, `writeFolderMarker` (never creates the folder),
  `retireFolderMarker`, `checkFolderMarker` (the boot's per-class check),
  `folderMarkerPath`. Typed errors: `DataLocationReadError`,
  `DataLocationInvalidError`, `DataLocationSchemaError`,
  `DataLocationPathError`, `DataFolderMarkerInvalidError`,
  `DataFolderMarkerMissingError`.
- `volumeIdentity`: `volumeIdentity(path)` (id, label, mount point and the
  path below it, for a folder that need not exist yet), `findVolume(id)`,
  `locateOnVolume(volume)`, `sameVolumeId`, `toRecordVolume`,
  `normalizeNetworkAddress`, with the OS readers behind an injected
  `CommandRunner`: macOS (`df`, `diskutil info -plist`, `diskutil list
  -plist`), Linux (`findmnt -P`), Windows (`Get-Volume` and
  `Win32_LogicalDisk` through PowerShell on stdin), and a network share's
  address on all three. Typed errors: `VolumeToolError`,
  `VolumeIdentityUnavailableError`. The Linux and Windows parsers are tested
  against hand-written fixtures, not output captured on those systems.
- `paths`: `ensureDataDir(dir, { create: false, className })` throws
  `DataDirMissingError` (naming the class and path) instead of creating an
  empty folder.

### Changed
- New dependencies: `@maipai/spec` (`file:../spec`, as `ui` has it) and
  `plist` (with `@types/plist`). `ensureDataDir(dir)` with no options behaves
  exactly as before.

## [0.1.0] - core-v0.1.0

### Added
- Sixteen product-agnostic helpers, extracted from `home/backend/src/lib`
  and `stack/backend/src/lib`: `log` (a factory, `createLogger`),
  `withTimeout`, `paths` (`ensureDataDir`, `statMtimeMs`), `archive`,
  `zip` (a dependency-free stored-ZIP writer), `hardware`, `openapi`,
  `secretThrottle` (`createThrottle`, `getClientIp`), `hlc`
  (`createHlcClock`), `id` (`randomSuffix`, `newPrefixedId`), `secrets`
  (`createSecrets`), `keystore` (`createKeystore`), `rateLimiter`
  (`createRateLimiter`), `singleflight`, `ssrfGuard`, `backupCrypto`.
  Plus two internal helpers shared between two of the above:
  `aesGcm` (`aesGcmEncrypt`/`aesGcmDecrypt`, behind `secrets` and
  `backupCrypto`) and `boundedMap` (`evictStaleIfFull`, behind
  `rateLimiter` and `secretThrottle`). See `../docs/dev.md` for what each
  replaced and why.
