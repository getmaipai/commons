"""Round-trips every fixture in spec/fixtures/records/ through its generated
Pydantic model. This is the Python half of the proof required by platform
plan 3: "home's check.sh round-trips every fixture in spec/fixtures/ through
both generated model sets." The TS half is spec/tests/ts/fixtures.test.ts.
"""

import json
from pathlib import Path

import pytest
from _standards import load_standards_module
from pydantic import ValidationError

from gen.py.artifact_schema import Artifact
from gen.py.content_ceiling_schema import ContentCeiling
from gen.py.conversation_schema import Conversation
from gen.py.conversation_turn_schema import ConversationTurn
from gen.py.device_command_schema import DeviceCommand
from gen.py.device_schema import Device
from gen.py.entity_schema import Entity
from gen.py.file_schema import File
from gen.py.grant_schema import Grant
from gen.py.issue_schema import Issue
from gen.py.list_schema import List
from gen.py.manifest_schema import PackageManifest
from gen.py.memory_record_schema import MemoryRecord
from gen.py.model_capabilities_schema import ModelCapabilities
from gen.py.open_question_schema import OpenQuestion
from gen.py.person_schema import Person
from gen.py.project_schema import ProjectPlan
from gen.py.relationship_schema import Relationship
from gen.py.reply_constraint_schema import ReplyConstraint
from gen.py.reply_feedback_schema import ReplyFeedback
from gen.py.reply_plan_schema import ReplyPlan
from gen.py.robot_asset_manifest_schema import RobotAssetManifest
from gen.py.robot_channel_frame_schema import RobotChannelFrame
from gen.py.robot_offer_schema import RobotOffer
from gen.py.robot_state_schema import RobotState
from gen.py.safety_result_schema import SafetyResult
from gen.py.setting_value_schema import SettingValue
from gen.py.settings_key_schema import SettingsKey
from gen.py.share_schema import Share
from gen.py.source_schema import Source
from gen.py.stack_fit_plan_schema import StackFitPlan
from gen.py.subject_ref_schema import Household, Unresolved, World
from gen.py.turn_artifact_schema import TurnArtifact
from gen.py.turn_signal_schema import TurnSignal

# ErrorEntry is standards-owned (std-v0.2.0), not generated here; loaded
# from the sibling .github checkout the same way spec/schemas/manifest
# .schema.json imports PrivacyRow by $ref. See tests/py/_standards.py for
# why this isn't a plain "from gen.py..." import.
ErrorEntry = load_standards_module("error_entry_schema").ErrorEntry

SPEC_DIR = Path(__file__).resolve().parents[2]
FIXTURES_DIR = SPEC_DIR / "fixtures" / "records"
ASSETS_FILE = SPEC_DIR / "assets" / "robot-assets.json"


def load_fixture(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_person_fixture():
    Person.model_validate(load_fixture("person.example.json"))


def test_setting_value_fixture():
    SettingValue.model_validate(load_fixture("setting-value.example.json"))


def test_settings_key_fixture():
    SettingsKey.model_validate(load_fixture("settings-key.example.json"))


@pytest.mark.parametrize("kind", ["person", "pet", "place"])
def test_entity_fixtures(kind: str):
    Entity.model_validate(load_fixture(f"entity.{kind}.example.json"))


@pytest.mark.parametrize("kind", ["shopping", "todo", "custom"])
def test_list_fixtures(kind: str):
    List.model_validate(load_fixture(f"list.{kind}.example.json"))


# Three relationship fixtures, one per case the two-axis design exists
# for: a former job (valid_to set), an estranged daughter (valid_to null,
# status estranged), and an unconfirmed inference.
@pytest.mark.parametrize("kind", ["stated", "estranged", "inferred"])
def test_relationship_fixtures(kind: str):
    Relationship.model_validate(load_fixture(f"relationship.{kind}.example.json"))


def test_grant_fixture():
    Grant.model_validate(load_fixture("grant.example.json"))


def test_issue_fixture():
    Issue.model_validate(load_fixture("issue.example.json"))


def test_device_fixture():
    Device.model_validate(load_fixture("device.example.json"))


@pytest.mark.parametrize("kind", ["reachy-mini", "reachy-mini-eyes", "maipai-build"])
def test_robot_device_fixture(kind):
    Device.model_validate(load_fixture(f"device.robot-{kind}.example.json"))


def test_reachy_eye_capability_is_only_on_the_fitted_fixture():
    plain = load_fixture("device.robot-reachy-mini.example.json")
    fitted = load_fixture("device.robot-reachy-mini-eyes.example.json")
    assert "eyes" not in plain["capabilities"]
    assert "eyes" in fitted["capabilities"]
    assert set(plain["capabilities"]) | {"eyes"} == set(fitted["capabilities"])


def test_device_command_fixtures_cover_every_kind_and_reject_mismatch():
    commands = load_fixture("device-command.kinds.example.json")
    assert len(commands) == 14
    for command in commands:
        DeviceCommand.model_validate(command)
    invalid = {**commands[0], "kind": "capture_request"}
    with pytest.raises(ValidationError):
        DeviceCommand.model_validate(invalid)
    with pytest.raises(ValidationError):
        DeviceCommand.model_validate(
            load_fixture("device-command.notify-waiting-with-text.invalid.example.json")
        )
    offer = next(command for command in commands if command["kind"] == "offer")
    assert "text" not in offer["payload"]
    with pytest.raises(ValidationError):
        DeviceCommand.model_validate(
            {**offer, "payload": {**offer["payload"], "text": "prepared content"}}
        )


def test_robot_channel_frames_and_voice_only_answers():
    frames = load_fixture("robot-channel-frame.kinds.example.json")
    assert len(frames) == 4
    for frame in frames:
        RobotChannelFrame.model_validate(frame)
    with pytest.raises(ValidationError):
        RobotChannelFrame.model_validate(
            load_fixture("robot-channel-frame.gesture-answer.invalid.example.json")
        )


def test_robot_offer_fixture():
    RobotOffer.model_validate(load_fixture("robot-offer.example.json"))


def test_robot_asset_pins_have_checksums_licences_and_no_moves_or_firmware():
    pins = json.loads(ASSETS_FILE.read_text())
    assert len(pins) == 6
    for row in pins:
        pin = RobotAssetManifest.model_validate(row)
        assert len(pin.sha256) == 64
        assert pin.licence.strip()
        assert pin.kind != "moves"
        assert "firmware" not in f"{pin.id} {pin.file} {pin.source_url}".lower()


def test_safety_alarm_notification_declaration():
    manifest = PackageManifest.model_validate(load_fixture("manifest.example.json"))
    alarm = next(item for item in manifest.notifications if item.id == "safety.alarm")
    assert alarm.level == "immediate"
    assert alarm.configurable is False
    assert alarm.audience == "household"
    assert alarm.actions == ["acknowledge", "quiet_here", "false_alarm"]


@pytest.mark.parametrize(
    "kind",
    [
        "starting",
        "idle",
        "listening",
        "thinking",
        "speaking",
        "reconnecting",
        "sleeping",
        "unknown-battery",
        "minimal",
        "held",
        "resting",
    ],
)
def test_robot_state_fixtures(kind: str):
    RobotState.model_validate(load_fixture(f"robot-state.{kind}.example.json"))


def test_robot_state_activity_rejects_unlisted_value():
    body = {**load_fixture("robot-state.idle.example.json"), "activity": "napping"}
    with pytest.raises(ValidationError):
        RobotState.model_validate(body)


def test_robot_state_app_version_present_null_and_omitted():
    present = RobotState.model_validate(load_fixture("robot-state.idle.example.json"))
    null = RobotState.model_validate(
        load_fixture("robot-state.unknown-battery.example.json")
    )
    omitted = RobotState.model_validate(
        load_fixture("robot-state.minimal.example.json")
    )
    assert present.app_version == "0.4.2"
    assert present.watch_level == "presence"
    assert null.app_version is None
    assert omitted.app_version is None


def test_robot_state_app_version_rejects_wrong_type():
    body = {**load_fixture("robot-state.idle.example.json"), "app_version": 4}
    with pytest.raises(ValidationError):
        RobotState.model_validate(body)


def test_robot_state_motion_and_put_down_count():
    held = RobotState.model_validate(load_fixture("robot-state.held.example.json"))
    resting = RobotState.model_validate(
        load_fixture("robot-state.resting.example.json")
    )
    bare = RobotState.model_validate(load_fixture("robot-state.minimal.example.json"))
    idle = load_fixture("robot-state.idle.example.json")
    assert held.motion == "held" and held.put_down_count == 0
    assert resting.motion == "resting" and resting.put_down_count == 3
    assert bare.motion is None and bare.put_down_count is None
    assert RobotState.model_validate({**idle, "motion": None}).motion is None
    for bad in (
        {"motion": "flying"},
        {"put_down_count": None},
        {"put_down_count": -1},
        {"put_down_count": 1.5},
        {"unexpected": True},
    ):
        with pytest.raises(ValidationError):
            RobotState.model_validate({**idle, **bad})


@pytest.mark.parametrize("value", ["held", "resting", "carried"])
def test_robot_state_activity_gains_no_motion_value(value: str):
    body = {**load_fixture("robot-state.idle.example.json"), "activity": value}
    with pytest.raises(ValidationError):
        RobotState.model_validate(body)


@pytest.mark.parametrize("kind", ["yes", "slow", "no", "unknown", "multi-role"])
def test_stack_fit_plan_fixtures(kind: str):
    StackFitPlan.model_validate(load_fixture(f"stack-fit-plan.{kind}.example.json"))


def test_stack_fit_plan_rejects_inconsistent_figure_shapes():
    body = load_fixture("stack-fit-plan.yes.example.json")
    body["total"] = {"low": 1, "high": None, "source": "unknown", "as_of": "2026-09-30"}
    with pytest.raises(ValidationError):
        StackFitPlan.model_validate(body)
    body = load_fixture("stack-fit-plan.yes.example.json")
    body["total"] = {
        "low": None,
        "high": 2,
        "source": "estimated",
        "as_of": "2026-09-30",
    }
    with pytest.raises(ValidationError):
        StackFitPlan.model_validate(body)


def test_conversation_fixture():
    Conversation.model_validate(load_fixture("conversation.example.json"))


def test_temporary_conversation_fixture():
    Conversation.model_validate(load_fixture("conversation.temporary.example.json"))


def test_source_fixture():
    Source.model_validate(load_fixture("source.example.json"))


def test_source_archive_fixture():
    Source.model_validate(load_fixture("source.archive.example.json"))


@pytest.mark.parametrize("kind", ["memory", "memory-legacy", "entity", "episode"])
def test_memory_record_fixtures(kind):
    MemoryRecord.model_validate(load_fixture(f"memory-record.{kind}.example.json"))


def test_manifest_fixture():
    PackageManifest.model_validate(load_fixture("manifest.example.json"))


@pytest.mark.parametrize(
    "path", sorted((SPEC_DIR / "fixtures" / "manifest-needs").glob("*.json"))
)
def test_manifest_needs_fixtures(path: Path):
    value = json.loads(path.read_text())
    if path.name.startswith("valid-"):
        PackageManifest.model_validate(value)
    else:
        with pytest.raises(ValidationError):
            PackageManifest.model_validate(value)


@pytest.mark.parametrize(
    "path", sorted((SPEC_DIR / "fixtures" / "status-event").glob("*.json"))
)
def test_status_event_fixtures(path: Path):
    from gen.py.status_event_schema import StatusEvent

    value = json.loads(path.read_text())
    if path.name.startswith("valid-"):
        StatusEvent.model_validate(value)
    else:
        with pytest.raises(ValidationError):
            StatusEvent.model_validate(value)


def test_manifest_companion_style_adapter_fixture():
    PackageManifest.model_validate(
        load_fixture("manifest.companion-style-adapter.example.json")
    )


def test_manifest_reference_fixture():
    PackageManifest.model_validate(load_fixture("manifest.reference.example.json"))


def test_manifest_project_fixture():
    PackageManifest.model_validate(load_fixture("manifest.project.example.json"))


# project-plan.example.json is a project-kind package's own plan.json body
# (PROJECT-PKGTYPE-01, home docs/BACKLOG.md), not yet part of a running
# Project record. Unlike the TS side, datamodel-codegen already hoists every
# $defs entry (ProjectPlan included) into its own class, so no workaround
# like Project.shape.plan is needed here.
def test_project_plan_fixture():
    ProjectPlan.model_validate(load_fixture("project-plan.example.json"))


def test_safety_result_fixture():
    SafetyResult.model_validate(load_fixture("safety-result.example.json"))


@pytest.mark.parametrize("band", ["child", "teen", "adult"])
def test_content_ceiling_fixtures(band: str):
    ContentCeiling.model_validate(load_fixture(f"content-ceiling.{band}.example.json"))


def test_content_ceiling_floor_is_identical_across_every_band():
    floors = [
        load_fixture(f"content-ceiling.{band}.example.json")["floor"]
        for band in ("child", "teen", "adult")
    ]
    assert floors[0] == floors[1] == floors[2]


def test_error_catalogue_entries():
    entries = json.loads((SPEC_DIR / "errors" / "errors.json").read_text())
    assert len(entries) > 0
    for entry in entries:
        ErrorEntry.model_validate(entry)


@pytest.mark.parametrize(
    "kind",
    [
        "chat",
        "image",
        "mlx-serve",
        "sherpa-onnx-node",
        "pocket-tts",
        "judge-role",
        "rerank-role",
        "music-role",
        "background-turns",
        "vision-role",
        "vision-chat",
    ],
)
def test_model_capabilities_fixtures(kind):
    ModelCapabilities.model_validate(
        load_fixture(f"model-capabilities.{kind}.example.json")
    )


def test_model_capabilities_background_turns_default_false():
    on = ModelCapabilities.model_validate(
        load_fixture("model-capabilities.background-turns.example.json")
    )
    absent = ModelCapabilities.model_validate(
        load_fixture("model-capabilities.chat.example.json")
    )
    assert on.turn_budget.background_turns is True
    assert absent.turn_budget.background_turns is False


def test_model_capabilities_background_turns_must_be_boolean():
    bad = load_fixture("model-capabilities.background-turns.example.json")
    bad["turn_budget"]["background_turns"] = "sometimes"
    with pytest.raises(ValidationError):
        ModelCapabilities.model_validate(bad)


def test_model_capabilities_background_turns_rejects_null():
    bad = load_fixture("model-capabilities.background-turns.example.json")
    bad["turn_budget"]["background_turns"] = None
    with pytest.raises(ValidationError):
        ModelCapabilities.model_validate(bad)


def test_model_capabilities_unknown_engine_is_rejected():
    bad = load_fixture("model-capabilities.chat.example.json")
    bad["engine"] = "unknown-engine"
    with pytest.raises(ValidationError):
        ModelCapabilities.model_validate(bad)


def test_model_capabilities_unknown_role_is_rejected():
    bad = load_fixture("model-capabilities.chat.example.json")
    bad["role"] = "nonsense"
    with pytest.raises(ValidationError):
        ModelCapabilities.model_validate(bad)


def test_model_capabilities_vision_declares_image_input_with_projector():
    record = ModelCapabilities.model_validate(
        load_fixture("model-capabilities.vision-role.example.json")
    )
    assert record.image_input.projector.file == "mmproj-Qwen3VL-4B-Instruct-Q8_0.gguf"


def test_model_capabilities_image_input_without_projector_is_rejected():
    bad = load_fixture("model-capabilities.vision-role.example.json")
    bad["image_input"] = {}
    with pytest.raises(ValidationError):
        ModelCapabilities.model_validate(bad)


def test_model_capabilities_projector_without_checksum_is_rejected():
    bad = load_fixture("model-capabilities.vision-role.example.json")
    del bad["image_input"]["projector"]["download"]["sha256"]
    with pytest.raises(ValidationError):
        ModelCapabilities.model_validate(bad)


def test_model_capabilities_text_only_model_has_no_image_input():
    record = ModelCapabilities.model_validate(
        load_fixture("model-capabilities.chat.example.json")
    )
    assert record.image_input is None


def test_model_capabilities_chat_footprints_fixture():
    ModelCapabilities.model_validate(
        load_fixture("model-capabilities.chat-footprints.example.json")
    )


def test_model_capabilities_footprint_without_hardware_is_rejected():
    with pytest.raises(ValidationError):
        ModelCapabilities.model_validate(
            load_fixture("model-capabilities.invalid-footprint-no-hardware.json")
        )


def test_model_capabilities_footprint_unknown_kv_cache_type_is_rejected():
    with pytest.raises(ValidationError):
        ModelCapabilities.model_validate(
            load_fixture("model-capabilities.invalid-footprint-kv-cache-type.json")
        )


def test_turn_signal_fixture():
    TurnSignal.model_validate(load_fixture("turn-signal.example.json"))


def test_turn_signal_computed_fixture():
    TurnSignal.model_validate(load_fixture("turn-signal.computed.example.json"))


def test_file_fixture():
    File.model_validate(load_fixture("file.example.json"))


def test_file_made_image_fixture():
    File.model_validate(load_fixture("file.made-image.example.json"))


def test_share_fixture():
    Share.model_validate(load_fixture("share.example.json"))


def test_reply_plan_fixture():
    ReplyPlan.model_validate(load_fixture("reply-plan.example.json"))


# SubjectRef's root is a bare oneOf (no wrapping object), which
# datamodel-codegen collapses away rather than emitting a combined union
# type on the Python side (json-schema-to-zod does emit one for TS - see
# spec/tests/ts/fixtures.test.ts's own SubjectRef.parse() calls). Each
# variant's own generated class round-trips its fixture just as well; this
# is a documented generator asymmetry, not a schema bug (README, "Why two
# generated model sets").
def test_subject_ref_household_fixture():
    Household.model_validate(load_fixture("subject-ref.household.example.json"))


def test_subject_ref_world_fixture():
    World.model_validate(load_fixture("subject-ref.world.example.json"))


def test_subject_ref_world_with_entity_id_is_rejected():
    bad = {**load_fixture("subject-ref.world.example.json"), "entity_id": "ent-p7q8r9"}
    with pytest.raises(ValidationError):
        World.model_validate(bad)


def test_subject_ref_unresolved_fixture():
    Unresolved.model_validate(load_fixture("subject-ref.unresolved.example.json"))


@pytest.mark.parametrize("kind", ["conversation-turn", "conversation-turn.branch"])
def test_conversation_turn_fixtures(kind):
    ConversationTurn.model_validate(load_fixture(f"{kind}.example.json"))


def test_open_question_fixture():
    OpenQuestion.model_validate(load_fixture("open-question.example.json"))


@pytest.mark.parametrize(
    "kind", ["lookup", "card", "procedure", "comparison", "document"]
)
def test_turn_artifact_fixtures(kind: str):
    TurnArtifact.model_validate(load_fixture(f"turn-artifact.{kind}.example.json"))


def test_reply_constraint_fixture():
    ReplyConstraint.model_validate(load_fixture("reply-constraint.example.json"))


def test_reply_feedback_fixture():
    ReplyFeedback.model_validate(load_fixture("reply-feedback.example.json"))


@pytest.mark.parametrize("kind", ["v1", "v2"])
def test_artifact_fixtures(kind: str):
    Artifact.model_validate(load_fixture(f"artifact.{kind}.example.json"))


def test_artifact_second_version_chains_to_the_first_by_id():
    v1 = load_fixture("artifact.v1.example.json")
    v2 = load_fixture("artifact.v2.example.json")
    assert v2["parent_version"] == v1["id"]


def test_person_missing_required_field_is_rejected():
    bad = load_fixture("person.example.json")
    del bad["role"]
    with pytest.raises(ValidationError):
        Person.model_validate(bad)


def test_person_with_unknown_field_is_rejected():
    bad = {**load_fixture("person.example.json"), "extra": "nope"}
    with pytest.raises(ValidationError):
        Person.model_validate(bad)


def test_robot_hello_setting_fixture():
    SettingsKey.model_validate(load_fixture("settings-key.robot-hello.example.json"))


def test_model_capabilities_vision_chat_declares_no_thinking_mode():
    parsed = ModelCapabilities.model_validate(
        load_fixture("model-capabilities.vision-chat.example.json")
    )
    assert parsed.role == "chat"
    assert parsed.image_input is not None
    assert parsed.thinking_mode == "none"


def test_model_capabilities_rejects_unknown_thinking_mode():
    bad = {
        **load_fixture("model-capabilities.vision-chat.example.json"),
        "thinking_mode": "sometimes",
    }
    with pytest.raises(ValidationError):
        ModelCapabilities.model_validate(bad)
