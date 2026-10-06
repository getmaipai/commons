import json
from pathlib import Path

from gen.py.searxng_engines_schema import SearxngEngines

SPEC = Path(__file__).resolve().parents[2]


def load(path: Path) -> dict:
    return json.loads(path.read_text())


def test_catalog_round_trips_to_the_filed_fixture():
    catalog = load(SPEC / "search" / "searxng-engines.json")
    fixture = load(SPEC / "fixtures" / "searxng-engines" / "valid-default-groups.json")
    parsed = SearxngEngines.model_validate(catalog)
    assert parsed.model_dump(mode="json", by_alias=True, exclude_unset=True) == fixture


def test_catalog_has_default_groups_and_flagged_engines():
    catalog = SearxngEngines.model_validate(
        load(SPEC / "search" / "searxng-engines.json")
    )
    groups = {group.id: group for group in catalog.groups}
    assert catalog.minimums.model_dump(mode="json", by_alias=True) == {
        "jsonFormatRequired": True,
        "wikipediaRequired": True,
        "webEngines": 2,
        "childWebEngines": 1,
        "childImageEngines": 1,
        "pictureEngines": 1,
    }
    assert groups["general"].locked and groups["general"].default_on
    assert groups["reference"].locked and groups["reference"].default_on
    assert all(groups[group].default_on for group in ("images", "news", "video"))
    assert not groups["science"].default_on and not groups["extra"].default_on
    assert {engine.name for engine in groups["extra"].engines} == {"yandex", "baidu"}
    assert all(engine.privacy_flag for engine in groups["extra"].engines)
    assert all(
        engine.operator and engine.country
        for group in groups.values()
        for engine in group.engines
    )
