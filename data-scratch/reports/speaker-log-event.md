# SPEAK-01 speaker log event

Added `stt_speaker_match` to `spec/log/events.json` with component `stt`, the requested description, and a closed `outcome` enum: `confirmed`, `no_match`, or `unavailable`. The event carries no person identifier, audio, score, or count. The registry supports `code` fields, but those must name a stable code from `errors/errors.json`; no speaker-match code was defined, so the event contains only `outcome`.

Updated the log event schema's component enum to admit `stt`, regenerated the TypeScript and Python bindings, and added a TypeScript assertion for the event shape. There is no event fixture in the existing LOG-PRIV-01a setup.

Validation: `bash scripts/check.sh` passed. This included the full repository checks, 1,222 spec TypeScript tests, and 628 spec Python tests. Existing UI lint warnings and non-failing test-environment diagnostics were emitted.

The event change is committed separately from the required package version bump. No tag was created.
