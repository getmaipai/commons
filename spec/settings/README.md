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

A worked example of a valid entry lives in
[`../fixtures/records/settings-key.example.json`](../fixtures/records/settings-key.example.json).
