import pytest
from pydantic import ValidationError

from gen.py.robot_state_schema import RobotState

FRAME = {"activity": "idle", "muted": False, "tracking": False}
MOTIONS = [
    "resting",
    "held",
    "lifted",
    "carried",
    "set_down",
    "shaken",
    "tilted",
    "tapped",
    "falling",
    "bumped",
    "rolling",
]
POSES = ["upright", "left_side", "right_side", "upside_down", "face_down", "on_back"]


@pytest.mark.parametrize("motion", MOTIONS)
def test_robot_state_accepts_shared_motion_states_and_legacy_values(motion):
    assert RobotState.model_validate({**FRAME, "motion": motion}).motion == motion


def test_robot_state_motion_null_and_omission_are_valid():
    assert RobotState.model_validate({**FRAME, "motion": None}).motion is None
    assert RobotState.model_validate(FRAME)


@pytest.mark.parametrize("pose", [*POSES, None])
def test_robot_state_accepts_motion_pose_values(pose):
    assert RobotState.model_validate({**FRAME, "motion_pose": pose})


def test_robot_state_rejects_unknown_motion_and_invalid_pose():
    with pytest.raises(ValidationError):
        RobotState.model_validate({**FRAME, "motion": "flying"})
    with pytest.raises(ValidationError):
        RobotState.model_validate({**FRAME, "motion": "still"})
    with pytest.raises(ValidationError):
        RobotState.model_validate({**FRAME, "motion_pose": "sitting"})
