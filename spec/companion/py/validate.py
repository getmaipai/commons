"""Pure cross-field checks for a companion pack manifest."""

from collections.abc import Mapping


def validate_companion_pack(
    pack: Mapping, files: Mapping[str, int] | None = None
) -> list[str]:
    problems: list[str] = []
    seen: set[str] = set()
    for state, clips in pack["states"].items():
        rates = [clip["fps"] for clip in clips]
        if rates and max(rates) - min(rates) > 1:
            problems.append(
                f"states.{state} clips must use frame rates within 1 fps; make the clips match."
            )
        paths: set[str] = set()
        for index, clip in enumerate(clips):
            field = f"states.{state}[{index}]"
            if clip["id"] in seen:
                problems.append(
                    f"{field}.id repeats clip id {clip['id']}; give every clip a unique id."
                )
            seen.add(clip["id"])
            if clip["file"] in paths:
                problems.append(
                    f"{field}.file repeats a file in states.{state}; give each clip in a state its own file."
                )
            paths.add(clip["file"])
            if clip["file"].lower().endswith(".webm"):
                problems.append(
                    f"{field}.file uses WebM; use an .mp4 stacked-alpha H.264 clip."
                )
            if not clip["trackFile"].endswith(".json"):
                problems.append(
                    f"{field}.trackFile must end in .json; use the track sidecar filename."
                )
            if clip.get("phone") and not clip["phone"].endswith(".mp4"):
                problems.append(
                    f"{field}.phone must end in .mp4; use the phone clip filename."
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
            if files is not None and clip.get("phone") and clip["phone"] not in files:
                problems.append(
                    f"{field}.phone has no matching file in files; include the phone twin."
                )
    if len(pack["states"]["idle"]) < 2:
        problems.append("states.idle needs at least 2 clips; add another idle clip.")
    dirs = [
        pack["mouth"]["calm"]["dir"],
        *([pack["head"]["dir"]] if pack.get("head") else []),
        *([pack["eyes"]["dir"]] if pack.get("eyes") else []),
        pack["emotion"]["dir"],
    ]
    if pack["mouth"].get("shout"):
        dirs.append(pack["mouth"]["shout"]["dir"])
    if files is not None:
        for directory in dirs:
            if f"{directory}/meta.json" not in files:
                problems.append(
                    f"{directory} needs meta.json; include the directory metadata file."
                )
        desktop_files = {
            path: size
            for path, size in files.items()
            if not path.endswith(".phone.mp4") and path != "build-report.json"
        }
        total = sum(desktop_files.values())
        if total > pack["budget"]["bytes"]:
            problems.append(
                f"budget.bytes is {pack['budget']['bytes']} but desktop files total {total} bytes; raise the budget or reduce file sizes."
            )
        if pack["tile"].get("desktop") == 480 and total > 12_582_912:
            problems.append(
                f"budget.bytes desktop files total {total} bytes, over the desktop limit of 12582912; reduce file sizes."
            )
    return problems
