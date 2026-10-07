"""Per-reader setting descriptions, matching the TypeScript interpreter."""

import json
import re
from pathlib import Path
from typing import Any

SPEC = Path(__file__).resolve().parents[2]
REASONS = json.loads((SPEC / "vocab" / "setting-reasons.json").read_text())


def _state_text(value: Any) -> str | None:
    if isinstance(value, bool):
        return "On" if value else "Off"
    if isinstance(value, (str, int, float)):
        return str(value)
    return None


def _render(line: str, context: dict[str, Any]) -> str:
    return line.replace("{admin}", context.get("adminName", "{admin}")).replace(
        "{person}", context.get("personName", "{person}")
    )


def _reason_line(code: str, context: dict[str, Any]) -> str | None:
    reader = (
        "admin"
        if context["viewer"] in ("admin", "guardian")
        else context["subjectBand"]
    )
    entry = REASONS.get(code, {}).get(reader)
    if not entry:
        return None
    line = entry.get("on" if context["effective"] is True else "off") or entry.get(
        "line", ""
    )
    return _render(line, context) or None


def describe_setting(
    setting: dict[str, Any], context: dict[str, Any]
) -> dict[str, str]:
    band = context["subjectBand"]
    does = (
        setting.get("copy", {}).get(f"does_{band}")
        or setting.get("copy", {}).get("does")
        or setting["label"]
    )
    result = {"does": does}

    if band == "teen" and context["viewer"] != "self":
        return result
    stricter = (
        context["effective"] != context["value"]
        and context["value"] is True
        and context["effective"] is False
    )
    if stricter:
        result["state"] = _state_text(context["effective"])
        reason = _reason_line("stricter_robot", context)
        if reason:
            result["reason"] = reason
        return result

    locked = setting.get("control", {}).get(band) != "self"
    viewing_child = band == "child" and context["viewer"] != "self" and locked
    if context["viewer"] == "self" and not locked:
        return result
    if not viewing_child and context["viewer"] != "self":
        return result
    baseline = setting.get("band_default", {}).get(band)
    reason_code = (
        "stricter_robot"
        if stricter
        else "off_until_guardian"
        if locked
        and context["source"] == "default"
        and baseline is False
        and context["value"] is False
        else "set_by_guardian"
        if locked and context["source"] == "user"
        else None
    )
    if locked or reason_code == "stricter_robot":
        state = _state_text(context["effective"])
        if state:
            result["state"] = state
        if reason_code:
            reason = _reason_line(reason_code, context)
            if reason:
                result["reason"] = reason
    return result


def lint_setting_copy(registry: list[dict[str, Any]], baseline: list[str]) -> list[str]:
    errors: list[str] = []
    missing = {
        entry["key"]
        for entry in registry
        if entry.get("level") == "basic" and not entry.get("copy", {}).get("does")
    }
    baseline_set = set(baseline)
    errors.extend(
        f"{key}: missing copy.does outside the baseline"
        for key in sorted(missing - baseline_set)
    )
    errors.extend(
        f"{key}: remove fixed entry from the shrink-only baseline"
        for key in sorted(baseline_set - missing)
    )

    for entry in registry:
        copy = entry.get("copy")
        if not copy:
            continue
        lines = [
            copy.get("does"),
            copy.get("does_child"),
            copy.get("does_teen"),
            *copy.get("options", {}).values(),
        ]
        for line in filter(lambda value: isinstance(value, str), lines):
            if len(line) > 90:
                errors.append(f"{entry['key']}: copy line exceeds 90 characters")
            if ";" in line or len(re.findall(r"[.!?]", line)) > 1:
                errors.append(f"{entry['key']}: copy line must be one sentence")
            if re.search(
                r"\b(adults?|teens?|children|kids?|parents?|admins?|owners?|everyone|by default|on by default|off until)\b",
                line,
                re.IGNORECASE,
            ):
                errors.append(
                    f"{entry['key']}: copy line names another audience or band default"
                )
            if re.search(
                r"\b(settings_changed|hub|delivered by|override)\b|\b[a-z][a-z0-9]*\.[a-z][a-z0-9_]*\b",
                line,
                re.IGNORECASE,
            ):
                errors.append(f"{entry['key']}: copy line contains internal jargon")
            if re.search(
                r"[—–]|\b(please|sorry|oops|invalid|forbidden|just|simply|basically|actually|currently)\b",
                line,
                re.IGNORECASE,
            ):
                errors.append(
                    f"{entry['key']}: copy line breaks interface writing style"
                )
            label = re.sub(r"[^a-z0-9 ]", " ", entry["label"].lower()).strip()
            content = re.sub(r"[^a-z0-9 ]", " ", line.lower()).strip()
            label_words = label.split()
            if (
                content.startswith(label)
                or sum(word in content.split() for word in label_words)
                > len(label_words) / 2
            ):
                errors.append(f"{entry['key']}: copy line repeats its label")
        options = entry.get("range", {}).get("options", [])
        if (
            entry.get("selector") == "select"
            and entry.get("range", {}).get("options_from") != "companion"
        ):
            for option in options:
                if not copy.get("options", {}).get(option):
                    errors.append(f"{entry['key']}: option {option} has no copy line")
        control = entry.get("control")
        defaults = entry.get("band_default")
        if control and (
            not defaults
            or any(band not in defaults for band in ("child", "teen", "adult"))
        ):
            errors.append(
                f"{entry['key']}: control and band_default must declare all three bands"
            )
    return errors
