"""LOG-PRIV-01a: the log-event registry and the problem_report record.

The if/then conditions of problem-report.schema.json are enforced and tested
by the TypeScript suite (Ajv); the Python models check the shapes.
"""

import copy
import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from gen.py.log_events_schema import LogEvents
from gen.py.problem_report_schema import ProblemReport

SPEC = Path(__file__).resolve().parents[2]
REGISTRY = json.loads((SPEC / "log" / "events.json").read_text())
ERROR_CODES = {
    e["code"] for e in json.loads((SPEC / "errors" / "errors.json").read_text())
}


def with_field(field: dict) -> dict:
    bad = copy.deepcopy(REGISTRY)
    bad["events"][0]["fields"].append(field)
    return bad


def test_registry_round_trips():
    parsed = LogEvents.model_validate(REGISTRY)
    assert (
        parsed.model_dump(mode="json", by_alias=True, exclude_none=True)["events"][0][
            "name"
        ]
        == "hub_start"
    )
    assert [e.name for e in parsed.events] == [e["name"] for e in REGISTRY["events"]]


def test_event_and_field_names_are_unique():
    names = [e["name"] for e in REGISTRY["events"]]
    assert len(set(names)) == len(names)
    for event in REGISTRY["events"]:
        fields = [f["name"] for f in event["fields"]]
        assert len(set(fields)) == len(fields)


@pytest.mark.parametrize("kind", ["string", "text", "url", "filename", "free_text"])
def test_string_typed_non_enum_field_is_rejected(kind):
    with pytest.raises(ValidationError):
        LogEvents.model_validate(with_field({"name": "detail", "type": kind}))


def test_enum_field_without_values_is_rejected():
    with pytest.raises(ValidationError):
        LogEvents.model_validate(with_field({"name": "kind", "type": "enum"}))


def test_extra_key_on_a_field_is_rejected():
    with pytest.raises(ValidationError):
        LogEvents.model_validate(
            with_field({"name": "detail", "type": "code", "default": "x"})
        )


def test_field_name_pattern_is_enforced():
    with pytest.raises(ValidationError):
        LogEvents.model_validate(with_field({"name": "Bad-Name", "type": "code"}))


def report() -> dict:
    return {
        "id": "pr-abc123",
        "provenance": {"component": "turn", "trace": "a1b2c3"},
        "created_at": "2026-10-07T10:00:00Z",
        "hlc": "1790000000000:0:node01",
        "code": "timeout",
        "reporter_mode": "adult",
        "parts": [
            {"kind": "code", "consented": True, "code": "timeout"},
            {"kind": "timing", "consented": True, "duration_ms": 1200},
            {
                "kind": "description",
                "consented": True,
                "content": "It stopped partway.",
            },
        ],
    }


def test_problem_report_round_trips_and_uses_real_error_codes():
    parsed = ProblemReport.model_validate(report())
    assert parsed.reporter_mode == "adult"
    assert report()["code"] in ERROR_CODES


@pytest.mark.parametrize("mode", ["adult_mode", "guest", "owner"])
def test_reporter_mode_is_only_the_three_modes(mode):
    bad = report()
    bad["reporter_mode"] = mode
    with pytest.raises(ValidationError):
        ProblemReport.model_validate(bad)


def test_extra_keys_such_as_ids_are_rejected():
    bad = report()
    bad["provenance"]["person_id"] = "person-abc123"
    with pytest.raises(ValidationError):
        ProblemReport.model_validate(bad)
    bad = report()
    bad["conversation_id"] = "conv-abc123"
    with pytest.raises(ValidationError):
        ProblemReport.model_validate(bad)
