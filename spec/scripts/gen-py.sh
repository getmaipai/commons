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
  --validators '{"RobotState":{"validators":[{"field":"put_down_count","function":"gen.py._validators.reject_explicit_null","mode":"before"},{"field":"clock_synced","function":"gen.py._validators.require_boolean","mode":"before"}]},"SettingsKey":{"validators":[{"field":"confirm_off","function":"gen.py._validators.confirm_off_requires_boolean","mode":"after"}]},"AskStep":{"validators":[{"field":"fields","function":"gen.py._validators.fields_requires_min_band","mode":"after"}]},"Ask":{"validators":[{"field":"fields","function":"gen.py._validators.fields_requires_min_band","mode":"after"}]},"PageContext":{"validators":[{"field":"record_id","function":"gen.py._validators.record_id_requires_record_kind","mode":"after"}]}}' \
  --disable-timestamp

# datamodel-code-generator currently emits non-required fields with a None
# default as Optional even when the schema excludes null. Keep its generated
# field validator self-contained in the committed gen/py package.
cp scripts/robot_state_validators.py gen/py/_validators.py

# The shared seed oneOf is referenced by name inside its own module (a
# datamodel-code-generator quirk), which leaves the model "not fully defined".
# Point those references at the classes defined in the same file.
python3 - <<'PY'
from pathlib import Path

path = Path("gen/py/song_style_schema.py")
path.write_text(path.read_text().replace("song_style_schema.Seed", "Seed"))
PY

# Once the broad sweep is modular (the cross-file manifest persona $ref), the
# generator also qualifies a union's references to classes in its own module
# with the module's name (answer_block_schema.X inside answer_block_schema.py),
# a NameError at import. Strip every module's own prefix, not just song_style's.
python3 - <<'PY'
import re
from pathlib import Path

for path in Path("gen/py").glob("*_schema.py"):
    text = path.read_text()
    fixed = re.sub(rf"(?<![\w.]){re.escape(path.stem)}\.(?=[A-Z])", "", text)
    if fixed != text:
        path.write_text(fixed)
PY

# datamodel-code-generator drops `maxProperties` (SPEC-INSTANCES-02:
# Integration.options allows at most 8 keys). Re-add it as a length bound.
python3 - <<'PY'
from pathlib import Path

path = Path("gen/py/integration_schema.py")
text = path.read_text()
old = "    ) = Field(\n        None,\n        description=\"Non-secret per-instance"
assert old in text, "integration.options field shape changed; update gen-py.sh"
path.write_text(text.replace(old, "    ) = Field(\n        None,\n        max_length=8,\n        description=\"Non-secret per-instance", 1))
PY

# datamodel-code-generator drops `uniqueItems` for Pydantic. MediaItem.locked_fields
# is unique in the schema (and in the TypeScript validator), so re-add the check
# (MEDIA-DETAIL-00; the invalid-locked-duplicate fixture proves it).
python3 - <<'PY'
from pathlib import Path

path = Path("gen/py/media_item_schema.py")
text = path.read_text()
anchor = "        description='A rescan updates every field except these; an edit adds the field name here.',\n    )\n"
assert anchor in text, "media-item locked_fields field shape changed; update gen-py.sh"
check = (
    "\n    @field_validator('locked_fields')\n"
    "    @classmethod\n"
    "    def locked_fields_must_be_unique(cls, value):\n"
    "        if len(value) != len(set(value)):\n"
    "            raise ValueError('locked_fields must contain unique values')\n"
    "        return value\n"
)
text = text.replace(anchor, anchor + check, 1)
if "field_validator" not in text.split("class ", 1)[0]:
    text = text.replace("from pydantic import (\n", "from pydantic import (\n    field_validator,\n", 1)
path.write_text(text)
PY

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
