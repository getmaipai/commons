import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from gen.py.integration_schema import Integration

RECORDS = Path(__file__).resolve().parents[2] / "fixtures" / "records"


def fixture(name: str) -> dict:
    return json.loads((RECORDS / name).read_text())


@pytest.mark.parametrize(
    "name",
    [
        "integration.default-home-assistant.example.json",
        "integration.second-uptime-kuma.example.json",
        "integration.tombstoned.example.json",
        "integration.options-uptime-kuma.example.json",
    ],
)
def test_valid_integration_round_trips(name):
    data = fixture(name)
    dumped = Integration.model_validate(data).model_dump(
        mode="json", exclude_unset=True
    )
    for key in ("created_at", "updated_at", "deleted_at"):
        dumped.pop(key, None)
        data.pop(key, None)
    assert dumped == data


@pytest.mark.parametrize(
    "name",
    [
        "integration.invalid-slug-slash.example.json",
        "integration.invalid-slug-colon.example.json",
        "integration.invalid-unknown-type.example.json",
        "integration.invalid-secret-field.example.json",
        "integration.invalid-options-uppercase-key.example.json",
        "integration.invalid-options-long-value.example.json",
        "integration.invalid-options-too-many.example.json",
        "integration.invalid-options-token-key.example.json",
        "integration.invalid-options-password-key.example.json",
        "integration.invalid-options-secret-key.example.json",
        "integration.invalid-options-api-key-key.example.json",
    ],
)
def test_invalid_integration_is_rejected(name):
    with pytest.raises(ValidationError):
        Integration.model_validate(fixture(name))
