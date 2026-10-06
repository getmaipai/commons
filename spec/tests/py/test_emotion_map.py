import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def load(path):
    return json.loads((ROOT / path).read_text())


def test_emotion_map_labels_primitives_and_optional_clip_manifest():
    mapping = load("vocab/emotion-map.json")
    pack = set(load("fixtures/moves/pollen-emotions-library.example.json")["files"])
    primitives = set(load("fixtures/moves/primitive-names.example.json")["primitives"])
    examples = load("fixtures/moves/emotion-map.examples.json")
    signal_schema = load("schemas/turn-signal.schema.json")
    assert examples == mapping["labels"]
    assert set(signal_schema["properties"]["expressed_emotion"]["enum"]) == {
        *(row["label"] for row in mapping["labels"]),
        *mapping["legacy_labels"],
    }
    assert mapping["legacy_labels"] == {
        "happiness": "happy",
        "surprise": "surprised",
        "sadness": "sad",
        "anger": None,
        "disgust": None,
        "fear": None,
    }
    assert [row["label"] for row in mapping["labels"]] == [
        "neutral",
        "happy",
        "excited",
        "curious",
        "surprised",
        "thinking",
        "gentle",
        "sad",
        "confused",
        "proud",
        "tired",
        "playful",
    ]
    for row in mapping["labels"]:
        assert row["primitive"] is None or row["primitive"] in primitives
        assert {f"{clip}.json" for clip in row["clip_candidates"]} <= pack
    assert (
        next(row for row in mapping["labels"] if row["label"] == "sad")[
            "clip_candidates"
        ]
        == []
    )


def test_robot_settings_registry_is_valid_and_unique():
    from gen.py.settings_key_schema import SettingsKey

    registry = json.loads((ROOT / "settings" / "keys.json").read_text())
    keys = [entry["key"] for entry in registry]
    assert len(keys) == len(set(keys))
    for entry in registry:
        SettingsKey.model_validate(entry)
    assert (
        next(entry for entry in registry if entry["key"] == "robot.offlan.tailnet")[
            "default"
        ]
        is False
    )
