"""Phase 1 API keys keep the same wire shape in Python."""

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from gen.py.api_key_schema import ApiKey
from gen.py.settings_key_schema import SettingsKey

FIXTURES = Path(__file__).resolve().parents[2] / "fixtures" / "records"


@pytest.mark.parametrize("name", ["api-key", "api-key.turn"])
def test_api_key_round_trip(name):
    value = json.loads((FIXTURES / f"{name}.example.json").read_text())
    parsed = ApiKey.model_validate(value)
    assert (
        json.loads(parsed.model_dump_json(by_alias=True, exclude_unset=True)) == value
    )


def test_api_key_requires_expiry():
    value = json.loads(
        (FIXTURES / "api-key.invalid-no-expiry.example.json").read_text()
    )
    with pytest.raises(ValidationError):
        ApiKey.model_validate(value)


def test_coding_engine_setting_fixtures_and_registry_defaults():
    valid = json.loads(
        (FIXTURES / "settings-key.coding-engine.example.json").read_text()
    )
    parsed = SettingsKey.model_validate(valid)
    assert (
        json.loads(parsed.model_dump_json(by_alias=True, exclude_unset=True)) == valid
    )
    invalid = json.loads(
        (FIXTURES / "settings-key.coding-engine.invalid.json").read_text()
    )
    with pytest.raises(ValidationError):
        SettingsKey.model_validate(invalid)

    registry = json.loads((FIXTURES.parents[1] / "settings" / "keys.json").read_text())
    entries = {entry["key"]: entry for entry in registry}
    assert entries["coding.yield_to_chat"]["default"] is True
    assert entries["coding.engine"]["default"] == "auto"
    assert entries["coding.splash_cache_gb"]["default"] == 8
