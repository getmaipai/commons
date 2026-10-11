# The settings registry

`keys.json` is the generated-from-declarations settings index (platform
plan 3.2 and docs/SETTINGS.md rule 5): every entry conforms to
[`../schemas/settings-key.schema.json`](../schemas/settings-key.schema.json).

This is not a placeholder to fill in by hand: core and packages declare
their own settings, and this file is regenerated from those declarations
(plus whatever a robot sends on `hello` for its own robot-only keys,
which the hub stores no copy of). KS-00 adds the eight knowledge-search
keys alongside the shared record shapes; Home implements their readers
and controls in the dependent slices.

The search source mode (KS-MODE-00) draws its options and copy from
[`../vocab/source-mode.json`](../vocab/source-mode.json). Migration of the
retired `search.wikipedia_fallback`: a stored `false` becomes
`search.source_mode.wikimedia = offline`; a stored `true` or no stored value
becomes `inherit`. The old key stays in `keys.json` until the tag paired with
KS-MODE-01, which also removes Home's local declaration of it.

A worked example of a valid entry lives in
[`../fixtures/records/settings-key.example.json`](../fixtures/records/settings-key.example.json).
