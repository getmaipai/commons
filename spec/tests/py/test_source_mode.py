"""KS-MODE-00: the Python half of the search source mode vocabulary check.

The bot may read the same registry, so "every mode key's options equal the
vocab" is held in both languages.
"""

import json
from pathlib import Path

SPEC = Path(__file__).resolve().parents[2]
VOCAB = json.loads((SPEC / "vocab" / "source-mode.json").read_text())
REGISTRY = {
    e["key"]: e for e in json.loads((SPEC / "settings" / "keys.json").read_text())
}
MODES = [v["value"] for v in VOCAB["values"]]


def test_vocab_declares_the_three_modes() -> None:
    assert sorted(MODES) == ["live", "mix", "offline"]
    assert VOCAB["default"] == "mix"


def test_every_mode_key_options_equal_the_vocab() -> None:
    assert REGISTRY["search.source_mode"]["range"]["options"] == MODES
    assert REGISTRY["search.source_mode"]["default"] == VOCAB["default"]
    for key in ("search.source_mode.wikimedia", "search.source_mode.web"):
        assert REGISTRY[key]["range"]["options"] == ["inherit", *MODES]
        assert REGISTRY[key]["default"] == VOCAB["override_default"]
        assert REGISTRY[key]["level"] == "advanced"


def test_the_retired_key_stays_for_this_tag() -> None:
    assert "search.wikipedia_fallback" in REGISTRY
