"""Pure cross-field checks for a companion pack manifest."""

from collections.abc import Mapping


def validate_companion_pack(
    pack: Mapping, files: Mapping[str, int] | None = None
) -> list[str]:
    problems: list[str] = []
    seen: set[str] = set()
    source = pack.get("source")
    if source is not None:
        x0, size = source.get("x0"), source.get("size")
        if not isinstance(x0, (int, float)) or isinstance(x0, bool) or not x0 >= 0 or x0 == float("inf"):
            problems.append("source.x0 must be a number of 0 or more; use the left edge of the tile in the layer frame.")
        if not isinstance(size, (int, float)) or isinstance(size, bool) or not 0 < size < float("inf"):
            problems.append("source.size must be a number above 0; use the side of the square tile in the layer frame.")
    if "voice" not in pack:
        for field in ("states", "mouth", "emotion", "life"):
            if field not in pack:
                problems.append(
                    f"{field} is required unless the pack has a voice layer; add {field} or add a voice layer with parts."
                )
    else:
        problems.extend(_validate_voice(pack, files))
    for state, clips in pack.get("states", {}).items():
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
    if "states" in pack and len(pack["states"]["idle"]) < 2:
        problems.append("states.idle needs at least 2 clips; add another idle clip.")
    dirs = [
        *([pack["mouth"]["calm"]["dir"]] if pack.get("mouth") else []),
        *([pack["head"]["dir"]] if pack.get("head") else []),
        *([pack["eyes"]["dir"]] if pack.get("eyes") else []),
        *([pack["emotion"]["dir"]] if pack.get("emotion") else []),
    ]
    if pack.get("mouth", {}).get("shout"):
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


def _validate_voice(pack: Mapping, files: Mapping[str, int] | None) -> list[str]:
    """MAKER-G: checks across the fields of a voice layer (reactive parts over a still picture)."""
    problems: list[str] = []
    voice = pack["voice"]
    tile = pack["tile"].get("desktop", 480)
    ids: set[str] = set()
    base = voice.get("base")
    if files is not None and base and base not in files:
        problems.append(
            f"voice.base names {base}, which is not in files; include the picture."
        )
    for index, part in enumerate(voice["parts"]):
        field = f"voice.parts[{index}]"
        if part["id"] in ids:
            problems.append(
                f"{field}.id repeats part id {part['id']}; give every part a unique id."
            )
        ids.add(part["id"])
        if files is not None and part["file"] not in files:
            problems.append(
                f"{field}.file names {part['file']}, which is not in files; include the picture."
            )
        box = part["box"]
        if (
            box["x"] < 0
            or box["y"] < 0
            or box["x"] + box["w"] > tile
            or box["y"] + box["h"] > tile
        ):
            problems.append(
                f"{field}.box leaves the {tile} pixel tile; move or shrink the box."
            )
        for e, effect in enumerate(part["effects"]):
            at = f"{field}.effects[{e}]"
            curve = effect.get("curve")
            channel = effect["channel"]
            if curve in ("pulse", "blink") and channel != "state":
                problems.append(
                    f"{at} uses the {curve} curve, which only works on the state channel; set channel to state."
                )
            if channel == "state" and "drive" not in effect:
                problems.append(
                    f"{at} uses the state channel without drive; add a drive for the states it should follow."
                )
            if channel != "state" and "drive" in effect:
                problems.append(
                    f"{at} has drive but its channel is {channel}; drive only applies to the state channel."
                )
            if "glow" in effect and "glow" not in part:
                problems.append(
                    f"{at} drives glow but the part has no glow colour; add glow.color to {field}."
                )
            moves = any(
                key in effect
                for key in (
                    "scale",
                    "scaleX",
                    "scaleY",
                    "rotate",
                    "translate",
                    "opacity",
                    "brightness",
                    "glow",
                )
            )
            if not moves:
                problems.append(
                    f"{at} changes nothing; add scale, rotate, translate, opacity, brightness or glow."
                )
    return problems
