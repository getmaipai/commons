import json
from pathlib import Path

from gen.py.blocklists_schema import Blocklists

SPEC = Path(__file__).resolve().parents[2]


def test_policy_round_trips_to_the_filed_fixture():
    policy = json.loads((SPEC / "search" / "blocklists.json").read_text())
    fixture = json.loads(
        (SPEC / "fixtures" / "blocklists" / "valid-default-lists.json").read_text()
    )
    parsed = Blocklists.model_validate(policy)
    assert parsed.model_dump(mode="json", by_alias=True, exclude_unset=True) == fixture


def test_adult_list_is_locked_for_child_and_teen():
    policy = Blocklists.model_validate(
        json.loads((SPEC / "search" / "blocklists.json").read_text())
    )
    porn = next(entry for entry in policy.lists if entry.category == "adult")
    assert set(porn.locked_for) == {"child", "teen"}
