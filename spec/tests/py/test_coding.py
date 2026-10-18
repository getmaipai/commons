"""Phase 1 API keys keep the same wire shape in Python."""

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from gen.py.api_key_schema import ApiKey

FIXTURES = Path(__file__).resolve().parents[2] / "fixtures" / "records"


@pytest.mark.parametrize("name", ["api-key", "api-key.turn"])
def test_api_key_round_trip(name):
    value = json.loads((FIXTURES / f"{name}.example.json").read_text())
    parsed = ApiKey.model_validate(value)
    assert json.loads(parsed.model_dump_json(exclude_unset=True)) == value


def test_api_key_requires_expiry():
    value = json.loads(
        (FIXTURES / "api-key.invalid-no-expiry.example.json").read_text()
    )
    with pytest.raises(ValidationError):
        ApiKey.model_validate(value)
