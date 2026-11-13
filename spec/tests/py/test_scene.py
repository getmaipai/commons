"""SCENE-01a runtime shape validation."""

import pytest
from pydantic import ValidationError

from gen.py.scene_observation_schema import SceneObservation
from gen.py.scene_schema import Scene

SOURCE = {"surface": "robot", "device_id": None, "sensor": "face"}
PERSON = {
    "person_id": "person-abcdef",
    "label": None,
    "relation": "household",
    "band": "adult",
    "level": "confirmed",
}
VALUES = {
    "person_here": PERSON,
    "person_left": PERSON,
    "place": {"where": "home", "setting": "indoor", "area": None, "precision": "area"},
    "room": {"room": "kitchen"},
    "people_count": 2,
    "light": {"bucket": "bright"},
    "sound_event": {"class": "doorbell", "score": 0.8},
    "temperature": {"bucket": "cool"},
    "motion": {"state": "still", "pose": "upright"},
    "door": {"bucket": "open"},
    "weather": {"bucket": "rain"},
    "weather_alert": {"bucket": "severe"},
}


def observation(kind, value):
    return {
        "id": "obs-1",
        "source": SOURCE,
        "kind": kind,
        "value": value,
        "confidence": 0.8,
        "strength": "strong",
        "at": 1,
        "expires_at": 2,
    }


def test_each_kind_valid_and_wrong_value_invalid():
    for kind, value in VALUES.items():
        assert SceneObservation.model_validate(observation(kind, value)).root.kind == kind
        with pytest.raises(ValidationError):
            SceneObservation.model_validate(observation(kind, {}))


def test_unknown_kind_confidence_and_person_pattern_rejected():
    with pytest.raises(ValidationError):
        SceneObservation.model_validate(observation("unknown", 1))
    with pytest.raises(ValidationError):
        SceneObservation.model_validate(
            {**observation("people_count", 1), "confidence": 1.1}
        )
    with pytest.raises(ValidationError):
        SceneObservation.model_validate(
            observation("person_here", {**PERSON, "person_id": "bad"})
        )


def test_bot_present_maps_to_valid_person_here():
    present = [
        {"person": "person-abcdef", "basis": "face", "level": "confirmed"},
        {"person": None, "basis": "voice", "level": "tentative"},
    ]

    def map_present(items):
        return [
            observation(
                "person_here",
                {
                    "person_id": item["person"],
                    "label": None,
                    "relation": "household" if item["person"] else "unknown",
                    "band": "unknown",
                    "level": item["level"]
                    if item["level"] != "unknown"
                    else "tentative",
                },
            )
            for item in items
        ]

    for row in map_present(present):
        SceneObservation.model_validate(row)


def test_scene_valid_and_closed():
    row = {
        "conversation_id": "conv-abcdef",
        "people": [],
        "speaker": None,
        "place": None,
        "ambient": None,
        "weather": None,
        "alone": True,
        "child_present": False,
        "updated_at": 1,
    }
    assert Scene.model_validate(row).conversation_id == row["conversation_id"]
    with pytest.raises(ValidationError):
        Scene.model_validate({**row, "stored": True})
