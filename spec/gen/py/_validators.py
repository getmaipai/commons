"""Runtime validators referenced by the Pydantic generation configuration."""

from typing import Any

from pydantic import ValidationInfo


def reject_explicit_null(value: Any, _info: ValidationInfo) -> Any:
    """Keep optional put_down_count absent-only, matching its JSON Schema."""
    if value is None:
        raise ValueError("put_down_count cannot be null")
    return value
