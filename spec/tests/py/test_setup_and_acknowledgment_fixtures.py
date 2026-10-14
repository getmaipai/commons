"""SPEC-SETUP-WIZARD-01: backward-compatible setup steps and acknowledgments."""

import json
from pathlib import Path

import pytest

from gen.py.acknowledgment_schema import Acknowledgment
from gen.py.setup_state_schema import SetupState

SPEC = Path(__file__).resolve().parents[2]


def fixture(shape: str, name: str) -> dict:
    return json.loads((SPEC / "fixtures" / shape / name).read_text())


@pytest.mark.parametrize(
    "name",
    ["valid-backup-key-step.json", "valid-old-step-ids.json"],
)
def test_setup_state_backup_key_and_old_steps_parse(name: str) -> None:
    SetupState.model_validate(fixture("setup-state", name))


def test_acknowledgment_accepts_null_person_before_owner_exists() -> None:
    record = Acknowledgment.model_validate(
        fixture("acknowledgment", "valid-before-owner.json")
    )
    assert record.person_id is None


@pytest.mark.parametrize(
    "name",
    ["invalid-unknown-item-id.json", "invalid-empty-items.json"],
)
def test_acknowledgment_rejects_unknown_item_and_empty_items(name: str) -> None:
    with pytest.raises(ValueError):
        Acknowledgment.model_validate(fixture("acknowledgment", name))
