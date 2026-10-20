import json
from pathlib import Path

import pytest
from gen.py.robot_self_test_result_schema import RobotSelfTestResult
from pydantic import ValidationError

FIXTURES = Path(__file__).resolve().parents[2] / "fixtures" / "records"


def load(name: str):
    return json.loads((FIXTURES / name).read_text())


def test_robot_self_test_result_fixture_parses() -> None:
    assert RobotSelfTestResult.model_validate(
        load("robot-self-test-result.example.json")
    )


@pytest.mark.parametrize(
    "name",
    [
        "robot-self-test-result.invalid-detail.example.json",
        "robot-self-test-result.missing-ok.invalid.example.json",
    ],
)
def test_robot_self_test_result_invalid_fixtures_fail(name: str) -> None:
    with pytest.raises(ValidationError):
        RobotSelfTestResult.model_validate(load(name))
