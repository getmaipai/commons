"""GENUI-13a: the one definition of a paragraph in released reply text, the twin of interpreters/ts/paragraphs.ts.

A paragraph break is a blank line (a line holding only spaces or tabs) and the whitespace after it. A blank line inside
an open ``` code fence is not a break. Both twins read fixtures/paragraphs/cases.json, so the hub, the web, the robot
and Go count alike.
"""

import re

_BREAK = re.compile(r"\n[ \t]*\n\s*")


def inside_code_fence(text: str) -> bool:
    """True when `text` ends inside an open ``` code fence (an odd number of markers so far)."""
    return text.count("```") % 2 == 1


def _breaks(text: str) -> list[tuple[int, int]]:
    out: list[tuple[int, int]] = []
    for m in _BREAK.finditer(text):
        if inside_code_fence(text[: m.start()]):
            continue
        out.append((m.start(), m.end()))
    return out


def paragraph_count(text: str) -> int:
    """How many paragraphs `text` holds (blank pieces do not count)."""
    seen = 0
    start_of_piece = 0
    for start, end in _breaks(text):
        if text[start_of_piece:start].strip():
            seen += 1
        start_of_piece = end
    if text[start_of_piece:].strip():
        seen += 1
    return seen


def split_after_paragraph(text: str, n: int) -> tuple[str, str]:
    """Split `text` after its `n`th paragraph break: (before, after) with before + after == text.

    `n <= 0` puts everything after (before any text); a count past the last break puts everything before.
    """
    if n <= 0:
        return "", text
    seen = 0
    start_of_piece = 0
    for start, end in _breaks(text):
        if text[start_of_piece:start].strip():
            seen += 1
        start_of_piece = end
        if seen >= n:
            return text[:end], text[end:]
    return text, ""


def paragraph_cut(released: str, piece: str) -> int:
    """For a placer fed released text in pieces: the offset in `piece` just after its first paragraph break that is
    not inside a code fence, or -1 when there is none."""
    for m in _BREAK.finditer(piece):
        if inside_code_fence(released + piece[: m.start()]):
            continue
        return m.end()
    return -1


def at_paragraph_boundary(released: str) -> bool:
    """True when `released` is empty or ends at a paragraph break outside a code fence."""
    if not released.strip():
        return True
    return re.search(r"\n[ \t]*\n\s*$", released) is not None and not inside_code_fence(
        released
    )
