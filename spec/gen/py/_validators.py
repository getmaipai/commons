"""Runtime validators referenced by the Pydantic generation configuration."""

from typing import Any

from pydantic import ValidationInfo


def reject_explicit_null(value: Any, _info: ValidationInfo) -> Any:
    """Keep optional put_down_count absent-only, matching its JSON Schema."""
    if value is None:
        raise ValueError("put_down_count cannot be null")
    return value


def require_boolean(value: Any, _info: ValidationInfo) -> Any:
    """Reject coercion for optional JSON Schema boolean fields."""
    if value is not None and type(value) is not bool:
        raise ValueError("value must be a boolean")
    return value


def confirm_off_requires_boolean(value: Any, info: ValidationInfo) -> Any:
    """Match the schema: confirm_off copy is only allowed on a boolean selector."""
    if value is not None and info.data.get("selector") != "boolean":
        raise ValueError("confirm_off is only allowed when selector is boolean")
    return value


def fields_requires_min_band(value: Any, info: ValidationInfo) -> Any:
    """Match ask schemas: typed fields require an output floor."""
    if value is not None and info.data.get("min_band") is None:
        raise ValueError("min_band is required when fields is present")
    return value
