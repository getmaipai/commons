# clock_synced commons spec change

Added optional boolean `clock_synced` to `RobotState`. It means the robot's clock was last corrected against the hub's. The field is additive; existing producers may omit it. No spec version bump or tag was made.

Added valid fixtures for `true` and `false`, an invalid string fixture, and TS/Python assertions that omission remains valid and non-boolean values fail. Regenerated the TypeScript and Python bindings. The Python generator now emits a strict boolean validator so string coercion cannot violate the JSON Schema.

Validation: `MAIPAI_WT_SESSION=quiet-badger-clock-synced bash scripts/wt.sh check` passed. This includes 1,228 TS spec tests and 634 Python spec tests. UI tests also passed; existing lint and test environment warnings were printed.
