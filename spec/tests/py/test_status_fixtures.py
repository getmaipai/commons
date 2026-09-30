"""STATUS-B1 generated Pydantic round trip for status page records."""

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from gen.py.maintenance_window_schema import MaintenanceWindow
from gen.py.status_note_schema import StatusNote

FIXTURES = Path(__file__).resolve().parents[2] / "fixtures"
SCHEMAS = Path(__file__).resolve().parents[2] / "schemas"
SHAPES = {"status-note": StatusNote, "maintenance-window": MaintenanceWindow}


def files():
    return [
        (shape, path)
        for shape in SHAPES
        for path in sorted((FIXTURES / shape).glob("*.json"))
    ]


def body(shape, name):
    return json.loads((FIXTURES / shape / name).read_text())


@pytest.mark.parametrize(("shape", "path"), files(), ids=lambda x: str(x))
def test_fixture_matches_name(shape, path):
    value = body(shape, path.name)
    if path.name.startswith("valid-") or path.name == "window-ends-before-start.json":
        SHAPES[shape].model_validate(value)
    elif path.name == "invalid-duplicate-components.json":
        # Pydantic's generator has no uniqueItems support, so enforce this schema keyword explicitly.
        assert len(value["components"]) != len(set(value["components"]))
        assert (
            json.loads((SCHEMAS / f"{shape}.schema.json").read_text())["properties"][
                "components"
            ]["uniqueItems"]
            is True
        )
    else:
        with pytest.raises(ValidationError):
            SHAPES[shape].model_validate(value)


@pytest.mark.parametrize(
    ("shape", "path"), [(s, p) for s, p in files() if p.name.startswith("valid-")]
)
def test_valid_fixture_round_trips(shape, path):
    value = body(shape, path.name)
    model = SHAPES[shape].model_validate(value)
    assert model.model_dump(mode="json", by_alias=True, exclude_unset=True) == value


def test_window_ends_before_start_is_schema_level_valid_and_hub_must_reject():
    # JSON Schema cannot express ends_at > starts_at; the hub must reject this.
    SHAPES["maintenance-window"].model_validate(
        body("maintenance-window", "hub-enforced/window-ends-before-start.json")
    )
