"""DATA-LOCATION-00a: the Python half of the round trip for the three
shapes behind where a household's data lives (home docs/dev.md,
"DATA-LOCATION"). Every fixture under spec/fixtures/<shape>/ goes through
its generated Pydantic model: valid-* must load, invalid-* must be refused.
The TS half is spec/tests/ts/data-location-fixtures.test.ts.
"""

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from gen.py.data_class_schema import DataClass
from gen.py.data_folder_schema import DataFolder
from gen.py.data_location_schema import DataLocation
from gen.py.searxng_engines_schema import SearxngEngines

FIXTURES = Path(__file__).resolve().parents[2] / "fixtures"
SHAPES = {
    "searxng-engines": SearxngEngines,
    "data-class": DataClass,
    "data-location": DataLocation,
    "data-folder": DataFolder,
}


def load(shape: str, name: str) -> dict:
    return json.loads((FIXTURES / shape / name).read_text())


def cases() -> list[tuple[str, str]]:
    return [
        (shape, path.name)
        for shape in SHAPES
        for path in sorted((FIXTURES / shape).glob("*.json"))
    ]


@pytest.mark.parametrize(("shape", "name"), cases())
def test_fixture_matches_its_name(shape: str, name: str):
    body = load(shape, name)
    model = SHAPES[shape]
    if name.startswith("valid-"):
        model.model_validate(body)
    else:
        assert name.startswith("invalid-"), (
            f"{shape}/{name} must start valid- or invalid-"
        )
        with pytest.raises(ValidationError):
            model.model_validate(body)


@pytest.mark.parametrize(
    ("shape", "name"), [(s, n) for s, n in cases() if n.startswith("valid-")]
)
def test_valid_fixture_writes_back_as_the_same_json(shape: str, name: str):
    # The fields `schema`, `class` and `from` are Python names Pydantic
    # aliases (schema_, class_, from_); a writer must dump by alias to
    # put the record's own field names back on disk.
    body = load(shape, name)
    model = SHAPES[shape].model_validate(body)
    assert model.model_dump(mode="json", by_alias=True, exclude_unset=True) == body


def test_every_shape_has_valid_and_invalid_fixtures():
    for shape in SHAPES:
        names = [n for s, n in cases() if s == shape]
        assert any(n.startswith("valid-") for n in names), shape
        assert any(n.startswith("invalid-") for n in names), shape


def test_class_declaration_without_when_missing_is_refused():
    with pytest.raises(ValidationError):
        DataClass.model_validate(
            load("data-class", "invalid-missing-when-missing.json")
        )


def test_when_missing_has_exactly_hold_and_degrade():
    base = load("data-class", "valid-models.json")
    for value in ("hold", "degrade"):
        DataClass.model_validate({**base, "whenMissing": value})
    with pytest.raises(ValidationError):
        DataClass.model_validate({**base, "whenMissing": "refuse"})


def test_move_is_a_capability_and_refetch_is_the_separate_flag():
    base = load("data-class", "valid-models.json")
    for value in ("offline", "online", "empty"):
        DataClass.model_validate({**base, "move": value})
    with pytest.raises(ValidationError):
        DataClass.model_validate({**base, "move": "refetch"})


def test_root_only_location_reads_back_as_no_overrides_and_no_move():
    parsed = DataLocation.model_validate(load("data-location", "valid-root-only.json"))
    assert parsed.classes == {}
    assert parsed.move is None


def test_two_class_move_keeps_previous_entries_for_rollback():
    parsed = DataLocation.model_validate(
        load("data-location", "valid-overrides-and-two-class-move.json")
    )
    assert parsed.move is not None
    assert [step.class_ for step in parsed.move.steps] == ["records", "reference"]
    assert [step.mode for step in parsed.move.steps] == ["offline", "refetch"]
    assert parsed.move.steps[0].previous.path is None
    assert parsed.move.steps[0].previous.generation == 1


def test_override_carries_generation_and_volume_identity():
    parsed = DataLocation.model_validate(
        load("data-location", "valid-overrides-and-two-class-move.json")
    )
    models = parsed.classes["models"]
    assert models.generation == 2
    assert models.volume is not None
    assert models.volume.label == "Big"


def test_retired_marker_names_where_the_data_went_and_by_which_move():
    parsed = DataFolder.model_validate(load("data-folder", "valid-retired.json"))
    assert parsed.retired is not None
    assert parsed.retired.movedTo == "/Volumes/Big/MaiPai/home/people"
    assert parsed.retired.moveId == "01J9ZK5P0X3B7D9F2H4K6M8Q1S"


def test_live_marker_has_no_retired_field():
    assert (
        DataFolder.model_validate(load("data-folder", "valid-live.json")).retired
        is None
    )
