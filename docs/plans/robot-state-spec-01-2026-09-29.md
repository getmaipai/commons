# ROBOT-STATE-SPEC-01: the robot.state frame, spec first

Lane: codex-a, worktree `/tmp/commons-robot-state`, branch
`robot-state-spec-01` (already checked out off current `origin/main`).

Model floor: Codex, `low` reasoning - a small, well-precedented schema
addition, mirroring `biometric-print.schema.json`'s own recent landing
(`docs/BACKLOG.md`'s `PRINT-SPEC-01` entry - read it in full, it is the
exact shape and process this item follows).

## Ready handshake

Reply with your model, checkout path and branch, and "ready for
ROBOT-STATE-SPEC-01". Wait for "start".

## Why

A paired robot needs to push a small state frame (activity, muted,
tracking, battery, daemon version) to the hub so its Devices-page card
can show it - resolved by design-resolver 2026-09-29, full record in
`home`'s `docs/dev.md`, "Robot device state," and `bot`'s own
`docs/dev.md` pointer entry of the same name. This item is the shared
record shape both repos will build against - per this org's own rule
("shared record changes go through the spec first"), nothing in `home`
or `bot` should be built before this lands and tags.

## Steps

1. Read `spec/schemas/device.schema.json` and `spec/schemas/
   biometric-print.schema.json` in full for the house style (draft
   2020-12, `$id`, `additionalProperties: false`, a `required` array,
   per-field `description`s explaining the WHY not just the WHAT).
   Read `spec/gen/ts/device.ts` and `spec/gen/py/device_schema.py` to
   see what the generator actually produces for a schema like this one
   (you will regenerate these for your new schema, not hand-write
   them).
2. Write `spec/schemas/robot-state.schema.json`. Fields (all from the
   design record, cite it in the schema's own top-level `description`
   rather than re-deriving anything):
   - `activity`: string enum `["starting", "idle", "listening",
     "thinking", "speaking"]`.
   - `muted`: boolean.
   - `tracking`: boolean.
   - `on_battery`: `["boolean", "null"]` - null means the body cannot
     tell (Reachy Mini always sends null per the design's own section
     7 reference).
   - `battery_level`: `["number", "null"]`, `minimum: 0, maximum: 1`
     when present.
   - `daemon_version`: `["string", "null"]`.
   This is NOT a full spec record like `Device` or `BiometricPrint` -
   it has no `id`/`created_at`/`updated_at`/`hlc` of its own, since the
   design record is explicit this is a hub-local "state projection,"
   never synced, never given its own identity - it's a value object
   keyed externally by `device_id` (the hub's own `device_states`
   table, not built by this item). Do NOT add spec-record boilerplate
   fields this record doesn't need just because other schemas have
   them - if you're unsure whether a field belongs, re-read the design
   record's own wire-shape section rather than guessing from precedent.
   `required`: `["activity", "muted", "tracking"]` (battery/version are
   allowed to be entirely absent as well as null - your call on whether
   that's the same as null or worth distinguishing; state your
   reasoning in the schema's own description if you pick one).
3. `validate_robot_state` in both languages (mirror `validate_biometric_print`'s
   own file location/pattern in `spec/gen/py/` and `spec/gen/ts/` or
   wherever validators for non-generated-alone checks live - check
   `biometric-print`'s own validator file for where it was hand-added
   alongside the generated model). This schema is simple enough that
   JSON Schema validation alone likely covers everything (no
   cross-field check like `embedding.length === dim`) - if so, say
   plainly in your done report that no extra validator function was
   needed beyond what codegen already produces, don't invent a
   no-op wrapper function just to mirror the pattern superficially.
4. Regenerate: `bun run gen:ts` from `spec/` for the TypeScript side;
   find and run whatever produces `spec/gen/py/*_schema.py` for the
   Python side (check `spec/pyproject.toml`/a Makefile/the repo's own
   README for the exact command - `biometric_print_schema.py`'s own
   generation command is your reference).
5. Fixtures: at least one real, valid frame per `activity` value (or a
   representative few if all five feel redundant to fixture separately -
   your call, but cover at least `starting` and one mid-conversation
   value, since `starting` is the one the design record specifically
   calls out as easy to get wrong), plus one with `on_battery`/
   `battery_level`/`daemon_version` all null. Wire into whatever shared
   cross-language conformance suite `biometric-print`'s own fixtures
   already run through (grep for how those fixtures are consumed by
   both the Python and TS test suites).
6. `docs/BACKLOG.md`: add a `ROBOT-STATE-SPEC-01` entry mirroring
   `PRINT-SPEC-01`'s own shape exactly (what's landed, what's each
   other repo's job, the exit line).
7. Run `bash scripts/check.sh` from the repo root until green.
8. Cut a new spec tag per this repo's own tagging convention (check how
   `PRINT-SPEC-01`'s own landing commit cut `spec-v0.1.54` - mirror
   that exactly, including whatever changelog/version-bump step it
   involved).
9. Stage by name (never `-A`). One commit (or two if the tag cut is
   naturally its own commit, matching whatever `PRINT-SPEC-01` did).

## Exit checks

- `bash scripts/check.sh`, green.
- Code review at `low` effort (a small, well-precedented schema
  addition with a clear existing pattern to mirror - not a route, not
  auth, not control flow).
- Staged by name, pushed to `robot-state-spec-01`, or say you left it
  for the coordinator.

## Reporting

Report **ready**, wait for **start**. Report **done** with: the new
tag, `check.sh`'s pass line, confirmation the fixtures cover the cases
above, and whether you added a real `validate_robot_state` function or
determined (and said why) that schema validation alone was sufficient.
Report **blocked** with the exact failure. Report **question** if
`PRINT-SPEC-01`'s own precedent doesn't resolve something cleanly
(the exact validator file location, the exact tag-cut mechanism) -
don't guess a shape a real precedent should have settled.
