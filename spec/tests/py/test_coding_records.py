"""CODE-SPEC-01 and CODE-TIER-01: the coding records round-trip through the generated Pydantic models."""

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from gen.py.coding_environment_schema import CodingEnvironment
from gen.py.coding_event_schema import CodingEvent
from gen.py.coding_session_schema import CodingSession
from gen.py.git_connection_schema import GitConnection

FIXTURES = Path(__file__).resolve().parents[2] / "fixtures" / "records"

CASES = [
    (
        CodingSession,
        ["coding-session", "coding-session.minimal"],
        ["coding-session.invalid-tier.invalid"],
    ),
    (
        CodingEnvironment,
        ["coding-environment", "coding-environment.household"],
        ["coding-environment.invalid-secret.invalid"],
    ),
    (
        CodingEvent,
        ["coding-event", "coding-event.secret-found"],
        ["coding-event.invalid-kind.invalid"],
    ),
    (GitConnection, ["git-connection"], ["git-connection.invalid-token.invalid"]),
]


def load(name: str):
    return json.loads((FIXTURES / f"{name}.example.json").read_text())


@pytest.mark.parametrize("model,good,bad", CASES)
def test_fixtures(model, good, bad):
    for name in good:
        model.model_validate(load(name))
    for name in bad:
        with pytest.raises(ValidationError):
            model.model_validate(load(name))


def test_tier_defaults_to_standard():
    assert (
        CodingSession.model_validate(load("coding-session.minimal")).tier == "standard"
    )
