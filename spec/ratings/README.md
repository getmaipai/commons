# Content ratings

The shared scale is G (0), PG (1), PG-13 (2), R (3), X (4), and Prohibited (5). Prohibited means sexual content involving a minor and is shown to nobody. Unrated has no rank and means no rater could say. A viewer's ceiling is a rank from 0 to 4. The design record is Home's `docs/design/content-ratings-and-access-2026-11-16.md`.

A `ContentRating` is the one stamp every rated item and result carries. It records the level, source, rater and version, time, optional reasons, and optional outside label. A label is only present for `given` ratings. Prohibited requires the `minor_line` reason. Unrated carries no reasons.

A `ContentRater` describes one small unit that rates one or more kinds of content. Its priority says which rater is tried first. A rater that reaches the internet needs a privacy row.

## Outside labels

| System | Values and levels |
|---|---|
| `mpaa` | G to G, PG to PG, PG-13 to PG-13, R to R, NC-17 to X, X to X |
| `tv` | TV-Y to G, TV-Y7 to G, TV-G to G, TV-PG to PG, TV-14 to PG-13, TV-MA to R |
| `esrb` | E to G, E10+ to PG, T to PG-13, M to R, AO to X |
| `explicit` | true to R |
| `band` | child to G, teen to PG-13, adult to X |
| `audience` | all-ages to G, adult-only to X |
| `companion_audience` | all to G, teen to PG-13, adult to X |
| `safe_search` | strict to G, moderate to PG-13, off to X |
| `civitai_nsfw_level` | 1 to PG, 2 to PG-13, 4 to R, 8 to X, 16 to X |
| `civitai_nsfw` | true to X |
| `huggingface_tag` | not-for-all-audiences to X |

The pure helpers in `ts/contentRating.ts` return ranks, map known labels, and check a level against a ceiling. They do no I/O beyond loading the vocabulary. Unknown labels return `null`; outside labels never produce Prohibited or Unrated.

`child_disclosure` on a memory record is privacy data, not a rating. `adult_only` and `minor_only` on a Stack part describe a part, not its content. `content-ceiling.schema.json` remains unchanged beside this vocabulary; it governs the register of a generated reply per band.
