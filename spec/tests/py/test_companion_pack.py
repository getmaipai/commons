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


@pytest.mark.parametrize("path", FILES, ids=lambda path: path.name)
def test_fixture_matches_its_name(path: Path):
    body = json.loads(path.read_text())
    if path.name.startswith("valid-"):
        CompanionPack.model_validate(body)
    elif path.name in {
        "invalid-track-length.json",
        "invalid-duplicate-id.json",
        "invalid-fps-mismatch.json",
        "invalid-rest-first.json",
        "invalid-rest-last.json",
    }:
        assert validate_companion_pack(body)
    else:
        with pytest.raises(ValidationError):
            CompanionPack.model_validate(body)


EXPECTED = {
    "invalid-track-length.json": "states.listen[0].track has 1 values but frames is 117; make the track length equal frames.",
    "invalid-rest-first.json": "states.listen[0].rest.first is outside [0, frames); choose a frame from 0 through 116.",
    "invalid-rest-last.json": "states.think[0].rest.last is outside [0, frames); choose a frame from 0 through 116.",
    "invalid-idle-count.json": "states.idle needs at least 2 clips; add another idle clip.",
    "invalid-webm.json": "states.listen[0].file uses WebM; use an .mp4 stacked-alpha H.264 clip.",
    "invalid-duplicate-id.json": "states.listen[0].id repeats clip id man-idle1; give every clip a unique id.",
    "invalid-fps-mismatch.json": "states.speak clips must use frame rates within 1 fps; make the clips match.",
    "invalid-wide-shape.json": "mouth.letters.wide is missing; add the wide shape index used by the atlas.",
    "invalid-emotion-files.json": "emotion.sad needs both flow and residual files; add both filenames.",
}


@pytest.mark.parametrize(("name", "problem"), EXPECTED.items())
def test_validator_returns_expected_problem(name: str, problem: str):
    assert problem in validate_companion_pack(load(name))


def test_valid_demo_packs_have_no_problems():
    for path in FILES:
        if path.name.startswith("valid-"):
            assert validate_companion_pack(load(path.name)) == []


def test_file_sizes_are_checked_against_the_budget():
    assert validate_companion_pack(load("valid-man.json"), {"clip.mp4": 12_582_913}) == [
        "budget.bytes is 12582912 but files total 12582913 bytes; raise the budget or reduce file sizes.",
        "budget.bytes files total 12582913 bytes, over the desktop limit of 12582912; reduce file sizes.",
    ]
