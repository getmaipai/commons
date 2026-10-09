"""GENUI-13a: the shared paragraph helper (spec/interpreters/py/paragraphs.py), checked against the same cases the
TypeScript twin reads (fixtures/paragraphs/cases.json)."""

import json
from pathlib import Path

import pytest

from interpreters.py.paragraphs import (
    at_paragraph_boundary,
    inside_code_fence,
    paragraph_count,
    paragraph_cut,
    split_after_paragraph,
)

CASES = json.loads(
    (
        Path(__file__).resolve().parents[2] / "fixtures" / "paragraphs" / "cases.json"
    ).read_text()
)


@pytest.mark.parametrize("case", CASES["count"], ids=lambda c: c["name"])
def test_count(case: dict) -> None:
    assert paragraph_count(case["text"]) == case["count"]


@pytest.mark.parametrize("case", CASES["split"], ids=lambda c: c["name"])
def test_split(case: dict) -> None:
    before, after = split_after_paragraph(case["text"], case["n"])
    assert (before, after) == (case["before"], case["after"])
    assert before + after == case["text"]


@pytest.mark.parametrize("case", CASES["cut"], ids=lambda c: c["name"])
def test_cut(case: dict) -> None:
    assert paragraph_cut(case["released"], case["piece"]) == case["cut"]


@pytest.mark.parametrize("case", CASES["boundary"], ids=lambda c: c["name"])
def test_boundary(case: dict) -> None:
    assert at_paragraph_boundary(case["released"]) is case["at"]


def test_fence_is_marker_parity() -> None:
    assert inside_code_fence("") is False
    assert inside_code_fence("```js\nx") is True
    assert inside_code_fence("```js\nx\n```") is False
