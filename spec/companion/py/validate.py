"""Pure cross-field checks for a companion pack manifest."""

from collections.abc import Mapping


def validate_companion_pack(pack: Mapping, files: Mapping[str, int] | None = None) -> list[str]:
    problems: list[str] = []
    seen: set[str] = set()
    for state, clips in pack["states"].items():
        rates = [clip["fps"] for clip in clips]
        if rates and max(rates) - min(rates) > 1:
            problems.append(
                f"states.{state} clips must use frame rates within 1 fps; make the clips match."
            )
        for index, clip in enumerate(clips):
            field = f"states.{state}[{index}]"
            if clip["id"] in seen:
                problems.append(
                    f"{field}.id repeats clip id {clip['id']}; give every clip a unique id."
                )
            seen.add(clip["id"])
            if clip["file"].lower().endswith(".webm"):
                problems.append(
                    f"{field}.file uses WebM; use an .mp4 stacked-alpha H.264 clip."
                )
            if len(clip["track"]) != clip["frames"]:
                problems.append(
                    f"{field}.track has {len(clip['track'])} values but frames is {clip['frames']}; make the track length equal frames."
                )
            for edge in ("first", "last"):
                if not 0 <= clip["rest"][edge] < clip["frames"]:
                    problems.append(
                        f"{field}.rest.{edge} is outside [0, frames); choose a frame from 0 through {clip['frames'] - 1}."
                    )
    if len(pack["states"]["idle"]) < 2:
        problems.append("states.idle needs at least 2 clips; add another idle clip.")
    if "wide" not in pack["mouth"]["letters"]:
        problems.append(
            "mouth.letters.wide is missing; add the wide shape index used by the atlas."
        )
    for kind, emotion in pack["emotion"].items():
        if not emotion.get("flow") or not emotion.get("residual"):
            problems.append(
                f"emotion.{kind} needs both flow and residual files; add both filenames."
            )
    if files is not None:
        total = sum(files.values())
        if total > pack["budget"]["bytes"]:
            problems.append(
                f"budget.bytes is {pack['budget']['bytes']} but files total {total} bytes; raise the budget or reduce file sizes."
            )
        if pack["tile"].get("desktop") == 480 and total > 12_582_912:
            problems.append(
                f"budget.bytes files total {total} bytes, over the desktop limit of 12582912; reduce file sizes."
            )
    return problems
