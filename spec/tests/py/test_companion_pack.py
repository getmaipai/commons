"""PACK-01: schema fixtures and the pure pack validator."""

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from companion.py.validate import validate_companion_pack
from gen.py.companion_pack_schema import CompanionPack

FIXTURES = Path(__file__).resolve().parents[2] / "fixtures" / "companion-pack"
FILES = sorted(FIXTURES.glob("*.json"))


def load(name: str) -> dict:
    return json.loads((FIXTURES / name).read_text())


STRUCTURAL_INVALID = {
    "invalid-wide-shape.json",
    "invalid-emotion-files.json",
    "invalid-webm.json",
    "invalid-voice-empty-parts.json",
}


@pytest.mark.parametrize("path", FILES, ids=lambda path: path.name)
def test_fixture_matches_its_name(path: Path):
    body = json.loads(path.read_text())
    if path.name in STRUCTURAL_INVALID:
        with pytest.raises(ValidationError):
            CompanionPack.model_validate(body)
    else:
        CompanionPack.model_validate(body)


EXPECTED = {
    "invalid-idle-count.json": "states.idle needs at least 2 clips; add another idle clip.",
    "invalid-track-length.json": "states.listen[0].track has 1 values but frames is 117; make the track length equal frames.",
    "invalid-duplicate-id.json": "states.listen[0].id repeats clip id man-idle1; give every clip a unique id.",
    "invalid-fps-mismatch.json": "states.speak clips must use frame rates within 1 fps; make the clips match.",
    "invalid-rest-first.json": "states.listen[0].rest.first is outside [0, frames); choose a frame from 0 through 116.",
    "invalid-rest-last.json": "states.think[0].rest.last is outside [0, frames); choose a frame from 0 through 116.",
    "invalid-duplicate-state-file.json": "states.listen[1].file repeats a file in states.listen; give each clip in a state its own file.",
    "invalid-no-states-no-voice.json": "states is required unless the pack has a voice layer; add states or add a voice layer with parts.",
    "invalid-voice-glow-without-colour.json": "voice.parts[1].effects[0] drives glow but the part has no glow colour; add glow.color to voice.parts[1].",
    "invalid-voice-pulse-on-level.json": "voice.parts[1].effects[1] uses the pulse curve, which only works on the state channel; set channel to state.",
    "invalid-voice-box-outside-tile.json": "voice.parts[1].box leaves the 480 pixel tile; move or shrink the box.",
    "invalid-voice-duplicate-part.json": "voice.parts[3].id repeats part id heart; give every part a unique id.",
}


@pytest.mark.parametrize(("name", "problem"), EXPECTED.items())
def test_validator_returns_expected_problem(name: str, problem: str):
    assert problem in validate_companion_pack(load(name))


def test_valid_demo_packs_have_no_problems():
    for path in FILES:
        if path.name.startswith("valid-"):
            assert validate_companion_pack(load(path.name)) == []


def test_file_aware_checks_enforce_phone_twins_and_directory_metadata():
    result = validate_companion_pack(
        load("valid-man.json"), {"clips/idle1.phone.mp4": 1}
    )
    assert "mouth/calm needs meta.json; include the directory metadata file." in result
    assert (
        "states.idle[1].phone has no matching file in files; include the phone twin."
        in result
    )


def test_pack_without_head_and_eyes_needs_no_head_or_eyes_folders():
    pack = load("valid-no-head-eyes.json")
    assert "head" not in pack and "eyes" not in pack
    CompanionPack.model_validate(pack)
    problems = validate_companion_pack(
        pack,
        {"mouth/calm/meta.json": 1, "mouth/shout/meta.json": 1, "emotion/meta.json": 1},
    )
    assert [p for p in problems if "meta.json" in p] == []


def test_listed_but_broken_head_still_fails():
    problems = validate_companion_pack(
        load("invalid-head-missing-meta.json"),
        {"mouth/calm/meta.json": 1, "mouth/shout/meta.json": 1, "emotion/meta.json": 1},
    )
    assert "head needs meta.json; include the directory metadata file." in problems


def test_still_plus_parts_pack_needs_only_its_pictures():
    pack = load("valid-still-parts-maipai.json")
    for field in ("states", "mouth", "emotion", "life", "head", "eyes"):
        assert field not in pack
    CompanionPack.model_validate(pack)
    sizes = {
        name: 1000
        for name in [
            pack["rest"],
            pack["voice"]["base"],
            *[part["file"] for part in pack["voice"]["parts"]],
        ]
    }
    assert validate_companion_pack(pack, sizes) == []
    del sizes[pack["voice"]["parts"][1]["file"]]
    assert (
        "voice.parts[1].file names voice/heart.webp, which is not in files; include the picture."
        in validate_companion_pack(pack, sizes)
    )


def test_still_plus_parts_pack_over_budget_is_refused():
    pack = load("valid-still-parts-maipai.json")
    pack["budget"]["bytes"] = 10
    problems = validate_companion_pack(pack, {"rest.webp": 5000})
    assert any(problem.startswith("budget.bytes is 10") for problem in problems)
