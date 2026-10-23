"""Python mirror of central settings area/tab structure checks."""
import json
from collections import defaultdict
from pathlib import Path
from gen.py.settings_area_schema import SettingsArea

ROOT = Path(__file__).resolve().parents[2]
SETTINGS = ROOT / "settings"
FILE = json.loads((SETTINGS / "areas.json").read_text())
REGISTRY = json.loads((SETTINGS / "keys.json").read_text())
LEGACY = json.loads((SETTINGS / "legacy-sections.json").read_text())["mappings"]
OLD_IDS = {f"{area}/{section}" for area, sections in {
    "home": "general people search integrations ai pictures commands voices robot reference-library media-library storage maintenance privacy developer network coding".split(),
    "account": "profile appearance notifications voice pictures data device robot developer coding".split(),
    "chat": "general personalization skills shortcuts voice notifications memories parental-controls household".split(),
}.items() for section in sections}


def test_every_area_parses_and_page_counts_are_correct():
    assert sorted(a["id"] for a in FILE["areas"]) == ["account", "home"]
    assert [len(a["sections"]) for a in FILE["areas"]] == [7, 9]
    for area in FILE["areas"]:
        SettingsArea.model_validate(area)


def test_registry_groups_are_once_or_not_placed():
    drawn = defaultdict(int)
    for area in FILE["areas"]:
        for section in area["sections"]:
            for card in section.get("cards", []):
                if card.get("group"):
                    drawn[(card["scope"], card["group"])] += 1
    for card in FILE.get("device_cards", []):
        drawn[(card["scope"], card["group"])] += 1
    parked = {(n["scope"], n["group"]) for n in FILE["not_placed"]}
    groups = {(k["scope"], k["lives_in"]) for k in REGISTRY}
    assert groups == set(drawn) | parked
    assert all(drawn[g] + (g in parked) == 1 for g in groups)


def test_tab_view_and_audience_constraints_and_robot_detail():
    home = next(a for a in FILE["areas"] if a["id"] == "home")
    assert [s["id"] for s in home["sections"]] == ["household", "privacy", "ai", "media", "voice", "search", "apps", "backups", "advanced"]
    apps = next(s for s in home["sections"] if s["id"] == "apps")
    assert apps["detail"]["param"] == "id"
    assert [t["id"] for t in apps["detail"]["tabs"]] == ["overview", "behaviour", "access"]
    ai = next(s for s in home["sections"] if s["id"] == "ai")
    assert [t["id"] for t in ai["tabs"]] == ["overview", "models", "engines", "advanced", "coding"]


def test_legacy_map_covers_every_old_section_and_targets_existing_page_tabs():
    ids = [f"{x['old']['area']}/{x['old']['section']}" for x in LEGACY]
    assert len(ids) == len(set(ids))
    assert set(ids) == OLD_IDS
    for row in LEGACY:
        target = row.get("new") or row.get("replacement")
        if target is None:
            assert row.get("reason")
            continue
        area = next(a for a in FILE["areas"] if a["id"] == target["area"])
        page = next(s for s in area["sections"] if s["id"] == target["section"])
        if "new" in row:
            assert target["tab"] in {t["id"] for t in page["tabs"]}
