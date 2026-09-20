# Changelog (`@maipai/core`)

All notable changes to the `core` workspace. Format follows
[Keep a Changelog](https://keepachangelog.com); versions follow semver,
tagged `core-vX.Y.Z`. Everything stays `0.x` until Home's and the Stack's
adoption proves it.

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
