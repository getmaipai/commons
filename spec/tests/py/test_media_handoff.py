"""Media handoff fixtures validate and round-trip through generated models."""

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from gen.py.device_command_schema import DeviceCommand
from gen.py.media_presence_schema import MediaPresence
from gen.py.robot_state_schema import RobotState

ROOT = Path(__file__).resolve().parents[2]
MODELS = {
    "media-presence": MediaPresence,
    "robot-state": RobotState,
    "device-command": DeviceCommand,
}
CASES = [
    (name, path)
    for name in MODELS
    for path in sorted((ROOT / "fixtures" / name).glob("*.json"))
]


@pytest.mark.parametrize(
    ("name", "path"), CASES, ids=[f"{n}/{p.name}" for n, p in CASES]
)
def test_media_handoff_fixture(name, path):
    data = json.loads(path.read_text())
    if path.name.startswith("invalid-"):
        with pytest.raises(ValidationError):
            MODELS[name].model_validate(data)
    else:
        parsed = MODELS[name].model_validate(data)
        assert parsed.model_dump(mode="json", exclude_unset=True) == data
