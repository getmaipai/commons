#!/usr/bin/env bash
# Generates spec/gen/py/*.py (Pydantic v2) from spec/schemas/*.schema.json.
# Committed output, not run at build time. Run with: bash scripts/gen-py.sh
# (from spec/), then commit the result.
set -euo pipefail
cd "$(dirname "$0")/.."

echo '== bundling schemas (resolves the cross-repo standards $ref)'
bun run scripts/bundle-schemas.ts

rm -rf gen/py
uv run datamodel-codegen \
  --input schemas.resolved \
  --input-file-type jsonschema \
  --output gen/py \
  --output-model-type pydantic_v2.BaseModel \
  --target-python-version 3.12 \
  --use-schema-description \
  --collapse-root-models \
  --use-standard-collections \
  --use-union-operator \
  --strict-nullable \
  --enum-field-as-literal all \
  --validators '{"RobotState":{"validators":[{"field":"put_down_count","function":"gen.py._validators.reject_explicit_null","mode":"before"},{"field":"clock_synced","function":"gen.py._validators.require_boolean","mode":"before"}]}}' \
  --disable-timestamp

# datamodel-code-generator currently emits non-required fields with a None
# default as Optional even when the schema excludes null. Keep its generated
# field validator self-contained in the committed gen/py package.
cp scripts/robot_state_validators.py gen/py/_validators.py

# Stack wire schemas are excluded from the broad sweep because their
# conditional schemas are not preserved reliably. STT's event uses oneOf,
# which datamodel-code-generator handles, so keep its Python mirror generated
# explicitly from the same source schema.
uv run datamodel-codegen \
  --input schemas/stt-wire-event.schema.json \
  --input-file-type jsonschema \
  --output gen/py/stt_wire_event.py \
  --output-model-type pydantic_v2.BaseModel \
  --target-python-version 3.12 \
  --use-schema-description \
  --collapse-root-models \
  --use-standard-collections \
  --use-union-operator \
  --strict-nullable \
  --enum-field-as-literal all \
  --disable-timestamp

# The generator maps optional non-nullable properties to Optional[T]. Keep
# schema semantics by rejecting explicit null while allowing omission.
python3 - <<'PY'
from pathlib import Path

path = Path("gen/py/stt_wire_event.py")
source = path.read_text()
source = source.replace(
    "from pydantic import BaseModel, ConfigDict, Field, RootModel, confloat, constr",
    "from pydantic import BaseModel, ConfigDict, Field, RootModel, confloat, constr, field_validator",
)
source = source.replace(
    "    speaker: Speaker | None = None\n\n\nclass SttWireEvent5",
    "    speaker: Speaker | None = None\n\n"
    "    @field_validator(\"speaker\", mode=\"before\")\n"
    "    @classmethod\n"
    "    def speaker_must_not_be_null(cls, value):\n"
    "        if value is None:\n"
    "            raise ValueError(\"speaker must be omitted or an object\")\n"
    "        return value\n\n\nclass SttWireEvent5",
)
path.write_text(source)
PY

echo "Generated Pydantic v2 models into spec/gen/py/."
