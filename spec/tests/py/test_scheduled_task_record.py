import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from gen.py.scheduled_task_schema import ScheduledTask
from records.py.validate import validate_scheduled_task

RECORDS = Path(__file__).resolve().parents[2] / "fixtures" / "records"


def fixture(name: str) -> dict:
    return json.loads((RECORDS / f"scheduled-task.{name}.example.json").read_text())


@pytest.mark.parametrize(
    "name",
    ["daily-device-action", "weekly-scene", "once-remind", "paused", "tombstoned"],
)
def test_valid_scheduled_task_round_trips(name):
    data = fixture(name)
    model = ScheduledTask.model_validate(data)
    dumped = model.model_dump(mode="json", exclude_unset=True)
    for key in ("created_at", "updated_at", "deleted_at", "once_at"):
        dumped.pop(key, None)
        data.pop(key, None)
    assert dumped == data
    assert validate_scheduled_task(model) == []


@pytest.mark.parametrize("name", ["invalid-unknown-kind", "invalid-text-too-long"])
def test_schema_invalid_is_rejected(name):
    with pytest.raises(ValidationError):
        ScheduledTask.model_validate(fixture(name))


@pytest.mark.parametrize(
    "name",
    [
        "invalid-both-recurrence",
        "invalid-no-recurrence",
        "invalid-device-action-empty-targets",
        "invalid-remind-on-home-assistant",
        "invalid-external-ref-equals-id",
    ],
)
def test_rule_invalid_is_rejected_by_validator(name):
    model = ScheduledTask.model_validate(fixture(name))
    assert validate_scheduled_task(model)
    assert validate_scheduled_task(fixture(name))
