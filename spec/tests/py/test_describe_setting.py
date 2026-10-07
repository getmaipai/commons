"""Shared fixture and lint checks for setting descriptions."""

import json
from pathlib import Path

from interpreters.py.describe_setting import describe_setting, lint_setting_copy

SPEC = Path(__file__).resolve().parents[2]
ROWS = json.loads((SPEC / "fixtures" / "describe-setting.json").read_text())
REGISTRY = json.loads((SPEC / "settings" / "keys.json").read_text())
BASELINE = json.loads((SPEC / "settings" / "copy-lint-baseline.json").read_text())


def test_shared_describe_setting_fixtures() -> None:
    for row in ROWS:
        assert describe_setting(row["setting"], row["context"]) == row["expected"]


def test_teen_settings_have_no_state_or_reason_for_admin() -> None:
    row = next(row for row in ROWS if row["context"]["subjectBand"] == "teen")
    result = describe_setting(row["setting"], row["context"])
    assert "state" not in result
    assert "reason" not in result


def test_copy_lint_baseline_only_shrinks() -> None:
    assert lint_setting_copy(REGISTRY, BASELINE) == []
    new_key = {**REGISTRY[0], "key": "person.new_basic_key", "level": "basic"}
    assert "missing copy.does outside the baseline" in "\n".join(
        lint_setting_copy([*REGISTRY, new_key], BASELINE)
    )
    assert "shrink-only baseline" in "\n".join(
        lint_setting_copy(REGISTRY, [*BASELINE, "person.fixed_key"])
    )


def test_new_copy_rejects_other_audiences_and_missing_options() -> None:
    setting = {
        **REGISTRY[0],
        "key": "person.copy_test",
        "selector": "select",
        "range": {"options": ["first", "second"]},
        "copy": {"does": "Adults and teens can use this override setting."},
    }
    errors = "\n".join(lint_setting_copy([setting], ["person.copy_test"]))
    assert "names another audience" in errors
    assert "option first has no copy line" in errors
