"""STATUS-C1 generated Pydantic validation for status event records."""

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from gen.py.status_event_schema import StatusEvent

FIXTURES = Path(__file__).resolve().parents[2] / "fixtures" / "status-event"


@pytest.mark.parametrize("path", sorted(FIXTURES.glob("*.json")), ids=lambda p: p.name)
def test_fixture_matches_name(path):
    value = json.loads(path.read_text())
    if path.name.startswith("valid-"):
        StatusEvent.model_validate(value)
    else:
        with pytest.raises(ValidationError):
            StatusEvent.model_validate(value)


@pytest.mark.parametrize(
    "path", sorted(FIXTURES.glob("valid-*.json")), ids=lambda p: p.name
)
def test_valid_fixture_round_trips(path):
    value = json.loads(path.read_text())
    model = StatusEvent.model_validate(value)
    assert model.model_dump(mode="json", by_alias=True, exclude_unset=True) == value
