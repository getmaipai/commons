"""SPEC-SETAREA-01: the Python half of the settings-area conformance rules.

The bot reads the same registry and areas file, so the rule "each registry
key has exactly one card" is held in both languages.
"""

import json
from collections import defaultdict
from pathlib import Path

from gen.py.settings_area_schema import SettingsArea

SETTINGS = Path(__file__).resolve().parents[2] / "settings"
FILE = json.loads((SETTINGS / "areas.json").read_text())
REGISTRY = json.loads((SETTINGS / "keys.json").read_text())


def test_every_area_parses_as_a_settings_area() -> None:
    assert sorted(a["id"] for a in FILE["areas"]) == ["account", "chat", "home"]
    for area in FILE["areas"]:
        SettingsArea.model_validate(area)


def test_every_registry_key_has_exactly_one_card() -> None:
    drawn: dict[tuple[str, str, str], int] = defaultdict(int)
    for area in FILE["areas"]:
        for section in area["sections"]:
            for card in section.get("cards", []):
                if "group" not in card:
                    continue
                for level in card.get("levels", ["basic", "advanced"]):
                    drawn[(card["scope"], card["group"], level)] += 1
    parked = {(n["scope"], n["group"]) for n in FILE["not_placed"]}
    for key in REGISTRY:
        slot = (key["scope"], key["lives_in"], key["level"])
        if (key["scope"], key["lives_in"]) in parked:
            assert slot not in drawn, slot
        else:
            assert drawn[slot] == 1, (key["key"], slot, drawn[slot])


def test_expert_cards_sit_only_in_developer_sections() -> None:
    for area in FILE["areas"]:
        for section in area["sections"]:
            for card in section.get("cards", []):
                if "expert" in card.get("levels", []):
                    assert section["id"] == "developer"
                    assert card["levels"] == ["expert"]


def test_account_robot_card_is_adults_only() -> None:
    account = next(a for a in FILE["areas"] if a["id"] == "account")
    robot = next(s for s in account["sections"] if s["id"] == "robot")
    assert robot["bands"] == ["adult"]
