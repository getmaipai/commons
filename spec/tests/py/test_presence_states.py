"""PRESENCE-STATES-01: shared state coverage, cross-renderer joins and fixtures."""

import json
from pathlib import Path

from gen.py.robot_state_schema import RobotState

ROOT = Path(__file__).resolve().parents[2]


def read(path):
    return json.loads((ROOT / path).read_text())


def presence_frame(state):
    return RobotState.model_validate(
        {"activity": "idle", "muted": False, "tracking": False, "presence": state}
    )


def test_each_state_has_a_valid_eyes_primitive_web_and_emotion_mapping():
    vocab = read("vocab/presence-states.json")
    emotions = read("vocab/emotion-map.json")
    emotion_rows = {row["label"]: row["child_band"] for row in emotions["labels"]}
    primitives = set(read("fixtures/moves/primitive-names.example.json")["primitives"])
    assert [row["state"] for row in vocab["states"]] == [
        "idle",
        "present",
        "listening",
        "thinking",
        "working",
        "speaking",
        "asking",
        "done",
        "concerned",
        "sleeping",
        "offline",
    ]
    for row in vocab["states"]:
        assert presence_frame(row["state"]).presence == row["state"]
        assert row["eyes"] in vocab["eyes_look_keys"]
        assert row["primitive"] in primitives
        assert row["web"]["orb"] in {
            "idle",
            "listening",
            "connecting",
            "speaking",
            "muted",
        }
        assert row["web"]["agent_status"] in {
            None,
            "working",
            "waiting",
            "done",
            "failed",
        }
        assert row["child_state"] in {state["state"] for state in vocab["states"]}
        assert row["child_band"] in set(emotion_rows.values())
        for dial in ("motion", "focus", "alert"):
            assert 0 <= row[dial] <= 1
        if row["emotion_overlay"] is not None:
            assert row["emotion_overlay"] in emotion_rows
            assert row["child_band"] == emotion_rows[row["emotion_overlay"]]
    concerned = next(row for row in vocab["states"] if row["state"] == "concerned")
    assert concerned["emotion_overlay"] == "confused"
    assert concerned["child_state"] == "idle"
    asking = next(row for row in vocab["states"] if row["state"] == "asking")
    assert asking["web"]["child_caption"] == "Asked a parent"
    assert all(row["child_state"] != "concerned" for row in vocab["states"])


def test_priority_timing_and_owner_id_rules_are_closed_and_explicit():
    vocab = read("vocab/presence-states.json")
    assert vocab["priority"] == [
        "offline",
        "sleeping",
        "asking",
        "listening",
        "speaking",
        "working",
        "thinking",
        "done",
        "present",
        "idle",
    ]
    assert vocab["timing"] == {
        "idle_grace_ms": 2000,
        "stale_expiry_ms": 120000,
        "durable_reconcile_ms": 5000,
    }
    assert vocab["activity_policy"]["stale_expiry"] == {
        "after_ms": 120000,
        "kinds": ["turn", "tool", "voice"],
        "action": "drop stale activity and log it",
        "never_expire": ["ask"],
    }
    assert vocab["activity_policy"]["durable_reconcile"]["every_ms"] == 5000
    assert vocab["dial_tokens"] == {
        "motion": "--presence-motion",
        "focus": "--presence-focus",
        "alert": "--presence-alert",
    }
    assert set(vocab["activity_kinds"]) == set(vocab["owner_id_rules"])
    assert all(vocab["owner_id_rules"].values())


def test_every_row_bot_event_has_a_fixture_and_presence_contains_no_private_reason():
    paths = sorted((ROOT / "fixtures/presence").glob("row-bot-*.json"))
    assert len(paths) == 25
    rows = [json.loads(path.read_text()) for path in paths]
    assert len({row["event"] for row in rows}) == 25
    for row in rows:
        assert row["source"] == "Row-Bot _EVENT_REACTIONS"
        assert presence_frame(row["presence"]).presence == row["presence"]
        assert (
            not {"owner_id", "person_id", "reason", "outcome", "refusal_reason"}
            & row.keys()
        )


def test_turn_stream_mapping_fixtures_and_additive_device_state_presence():
    vocab = read("vocab/presence-states.json")
    paths = sorted((ROOT / "fixtures/presence").glob("turn-stream-*.json"))
    assert len(paths) == len(vocab["turn_stream_events"])
    for path in paths:
        row = json.loads(path.read_text())
        assert any(
            entry["event"] == row["event"]
            and entry["presence"] == row["presence"]
            and entry.get("condition") == row.get("condition")
            for entry in vocab["turn_stream_events"]
        )
        if row["presence"] is not None:
            assert presence_frame(row["presence"]).presence == row["presence"]
    present = read("fixtures/records/robot-state.presence.example.json")
    assert RobotState.model_validate(present).presence == "idle"
    legacy = read("fixtures/records/robot-state.idle.example.json")
    assert RobotState.model_validate(legacy).presence is None
