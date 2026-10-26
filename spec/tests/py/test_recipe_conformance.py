"""The recipe conformance suite (platform plan 3.2): every fixture in
spec/fixtures/recipes/ must produce the same result from this interpreter
as from the TS one (tests/ts/recipe-conformance.test.ts). This is the
Python half of that proof.
"""

import json
from pathlib import Path

import pytest

from emulators.py.host_emulator import (
    ArtifactRecordLike,
    HostEmulator,
    HostError,
    MemoryRecordLike,
)
from gen.py.recipe_schema import Recipe
from gen.py.result_schema import PluginResult
from interpreters.py.recipe_interpreter import run_recipe

SPEC_DIR = Path(__file__).resolve().parents[2]
FIXTURES_DIR = SPEC_DIR / "fixtures" / "recipes"

fixture_files = sorted(FIXTURES_DIR.glob("*.json"))


@pytest.mark.asyncio
@pytest.mark.parametrize("fixture_path", fixture_files, ids=lambda p: p.name)
async def test_recipe_conformance(fixture_path: Path):
    fixture = json.loads(fixture_path.read_text())
    recipe = Recipe.model_validate(fixture["recipe"])

    host = HostEmulator()
    for url, body in fixture["host_setup"].get("fetch", {}).items():
        host.set_fetch_response(url, body)
    for key, value in fixture["host_setup"].get("config", {}).items():
        host.seed_config(key, value)
    for record in fixture["host_setup"].get("memory", []):
        host.seed_memory([MemoryRecordLike(**record)])
    if fixture["host_setup"].get("shopping_list"):
        host.seed_shopping_list(fixture["host_setup"]["shopping_list"])
    if fixture["host_setup"].get("artifacts"):
        host.seed_artifacts(
            [
                ArtifactRecordLike(**record)
                for record in fixture["host_setup"]["artifacts"]
            ]
        )

    # A fixture proving a host method throws (host.artifact.update's own
    # not_found/invalid_input) - mutually exclusive with `expected`: the
    # run is expected to raise rather than produce a result.
    if "expected_error" in fixture:
        with pytest.raises(HostError) as exc_info:
            await run_recipe(recipe, fixture["inputs"], host)
        assert exc_info.value.code == fixture["expected_error"]["code"]
        return

    result = await run_recipe(recipe, fixture["inputs"], host)

    assert result.get("reply") == fixture["expected"]["reply"]
    assert result["actions"] == fixture["expected"]["actions"]
    assert result.get("ask") == fixture["expected"].get("ask")
    # `data` (a format step's named fields) is compared whole when the
    # fixture expects it: a number has to arrive as a number.
    if "data" in fixture["expected"]:
        assert result.get("data") == fixture["expected"]["data"]
    # CHAT-16: a format step's hint reaches the result verbatim, or not
    # at all.
    assert result.get("synthesis_hint") == fixture["expected"].get("synthesis_hint")
    assert [
        {"when": j["when"], "job": j["job"], "inputs": j["inputs"]}
        for j in host.scheduled_jobs
    ] == fixture["expected"]["scheduled_jobs"]
    assert host.home_calls_log == fixture["expected"]["home_calls"]
    assert [
        {"text": m["text"], "category": m["category"], "scope": m["scope"]}
        for m in host.memory_store
    ] == fixture["expected"]["memory_added"]


def test_ask_form_fixture_has_typed_fields():
    fixture_path = FIXTURES_DIR / "ask-form.json"
    assert fixture_path in fixture_files


@pytest.mark.asyncio
async def test_ask_form_typed_fields_and_invalid_shapes():
    fixture = json.loads((FIXTURES_DIR / "ask-form.json").read_text())
    result = await run_recipe(Recipe.model_validate(fixture["recipe"]), fixture["inputs"], HostEmulator())
    assert result["ask"] == fixture["expected"]["ask"]
    PluginResult.model_validate({"ask": result["ask"]})

    field = {"name": "value", "label": "Value", "kind": "text", "required": True, "max_length": 500}
    ask = {"prompt": "Provide a value", "min_band": "adult", "fields": [field]}
    invalid = [
        {"ask": {**ask, "fields": [{**field, "name": f"field_{i}"} for i in range(5)]}},
        {"ask": {**ask, "fields": [{**field, "label": "x" * 81}]}},
        {"ask": {**ask, "fields": [{**field, "kind": "unknown"}]}},
        {"ask": {"prompt": ask["prompt"], "fields": ask["fields"]}},
    ]
    for value in invalid:
        with pytest.raises(Exception):
            PluginResult.model_validate(value)
    with pytest.raises(Exception):
        Recipe.model_validate({"id": "missing-band", "steps": [{"op": "ask", "prompt": ask["prompt"], "fields": ask["fields"]}]})
