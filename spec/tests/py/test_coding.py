"""Phase 1 API keys keep the same wire shape in Python."""

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from gen.py.api_key_schema import ApiKey
from gen.py.coding_mode_readiness_schema import CodingModeReadiness
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


def test_confirm_off_is_limited_to_boolean_settings():
    value = {
        "key": "test.confirm",
        "scope": "household",
        "selector": "boolean",
        "default": True,
        "label": "Test",
        "level": "basic",
        "lives_in": "test",
        "honoured_by": ["home"],
        "confirm_off": {"title": "Off?", "body": "Body", "action": "Off"},
    }
    SettingsKey.model_validate(value)
    with pytest.raises(ValidationError):
        SettingsKey.model_validate({**value, "selector": "select", "default": "x"})


def test_coding_mode_readiness_fixture_and_derived_ready_rule():
    value = json.loads((FIXTURES / "coding-mode-readiness.example.json").read_text())
    parsed = CodingModeReadiness.model_validate(value)
    assert (
        json.loads(parsed.model_dump_json(by_alias=True, exclude_unset=True)) == value
    )
    expected_ids = [
        "coding_enabled",
        "engine",
        "pieces",
        "hardware",
        "memory",
        "self_test",
        "client",
        "bench",
    ]
    assert [item.id for item in parsed.items] == expected_ids
    assert parsed.ready is all(item.state == "done" for item in parsed.items)
    assert parsed.first_unmet == next(
        (item.id for item in parsed.items if item.state != "done"), None
    )

    falsely_ready = {**value, "ready": True}
    parsed_false = CodingModeReadiness.model_validate(falsely_ready)
    # The schema cannot derive `ready`, so the rule lives in the consumer: a record that says ready
    # while an item is not done disagrees with its own items and must be treated as not ready.
    assert parsed_false.ready is True
    assert not all(item.state == "done" for item in parsed_false.items)
    assert parsed_false.ready != all(
        item.state == "done" for item in parsed_false.items
    )
