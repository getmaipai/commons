import json
from pathlib import Path

from gen.py.feed_lists_schema import FeedLists

SPEC = Path(__file__).resolve().parents[2]


def test_policy_round_trips_to_the_filed_fixture():
    policy = json.loads((SPEC / "news" / "feed-lists.json").read_text())
    fixture = json.loads(
        (SPEC / "fixtures" / "feed-lists" / "valid-default-lists.json").read_text()
    )
    parsed = FeedLists.model_validate(policy)
    assert parsed.model_dump(mode="json", by_alias=True, exclude_unset=True) == fixture


def test_kids_list_is_offered_to_child_only():
    policy = FeedLists.model_validate(
        json.loads((SPEC / "news" / "feed-lists.json").read_text())
    )
    kids = next(entry for entry in policy.lists if entry.id == "feeds-children")
    assert set(kids.offered_for) == {"child"}
