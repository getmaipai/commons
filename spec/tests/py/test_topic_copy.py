import json
from pathlib import Path

from gen.py.content_ceiling_schema import ContentCeiling
from gen.py.topic_copy_schema import TopicCopy

SPEC = Path(__file__).resolve().parents[2]
FAMILIES = ["bodies", "health", "feelings", "risk", "violence", "people", "beliefs"]


def test_copy_round_trips_to_the_filed_fixture():
    copy = json.loads((SPEC / "safety" / "topic-copy.json").read_text())
    fixture = json.loads(
        (SPEC / "fixtures" / "topic-copy" / "valid-default-copy.json").read_text()
    )
    parsed = TopicCopy.model_validate(copy)
    assert parsed.model_dump(mode="json", by_alias=True, exclude_unset=True) == fixture


def test_every_allowed_stance_has_a_sentence():
    copy = json.loads((SPEC / "safety" / "topic-copy.json").read_text())
    for band in ("child", "teen"):
        record = json.loads(
            (
                SPEC / "fixtures" / "records" / f"content-ceiling.{band}.example.json"
            ).read_text()
        )
        ContentCeiling.model_validate(record)
        assert sorted(record["topics"]) == sorted(FAMILIES)
        for family in FAMILIES:
            entry = record["topics"][family]
            assert entry["stance"] in entry["allowed"]
            for stance in entry["allowed"]:
                assert copy["families"][family][band][stance]
