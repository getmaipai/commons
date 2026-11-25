# Ring indicator standard

Status: approved by the owner 2026-11-13; colors aligned with the icon palette by the owner 2026-11-25 (spec-v0.1.485).

One light, one meaning per row. The ring is dark unless it tells a person something they need right now. Every status row has the same color as the matching top-row icon (see "The palette"), so a person learns each color once.

## The ring table

| Key | Meaning | Colour | Style | Period | Brightness | Notes |
|---|---|---|---|---:|---:|---|
| `live` | Connected | green | steady | 0s | 0.5 | Body connected |
| `camera` | Camera capture | pink | flash | 0.5s | 0.5 | Capture active |
| `pairing` | Pairing | cyan | pulse | 2s | 0.6 | Owner action |
| `attention` | Fault, offline, low battery | amber | pulse | 10s | 0.3 | One amber meaning (palette token trouble) |
| `getting_data` | Getting data | violet | breathe | 3s | 1.0 | The AI is fetching or running a tool |
| `listening` | Listening | green | steady | 0s | 1.0 | Audio capture |
| `speaking` | Speaking | cyan | steady | 0s | 1.0 | The voice is playing |
| `thinking` | Thinking | white | steady | 0s | 1.0 | The AI is working on an answer |
| `face_seen` | Face seen | yellow | double | 10s | 0.5 | A face is in view |
| `dance` | Dance | magenta | steady | 0s | 0.5 | Decorative |
| `idle` | Idle | dark | steady | 0s | 0 | No active state |

Brightness 1.0 rows are a share of the day or night level the household set; the fixed rows keep their number.

## Priority

Live, camera, pairing, attention, getting_data, listening, speaking, thinking, face_seen, dance, idle.

## The palette

The colors of the icons and the ring, one token per meaning. A ring row of `none` means the ring never shows that state. Blue and red are reserved for security alerts; the one red outside them is the connection dot's `down`, and the ring never shows red.

| Token | Hex | Ring row | Notes |
|---|---|---|---|
| `listening` | 00FF1A | `listening` | One listening green on the icon and the ring |
| `speaking` | 00E6FF | `speaking` | Cyan |
| `thinking` | FFFFE6 | `thinking` | Warm white |
| `getting_data` | 7300FF | `getting_data` | Violet; the icon adds an orbiting dot |
| `face_seen` | FFD600 | `face_seen` | Yellow: not blue, not red, apart from amber and white |
| `camera` | FF408C | `camera` | Pink |
| `healthy` | 00FF1A | `live` | The connection dot when the link is good |
| `trouble` | FF7300 | `attention` | Amber |
| `down` | FF4D4D | `none` | Red, the dot only; the ring shows the amber `attention` row |

## Colour names

green, pink, cyan, amber, violet, yellow, white, magenta, dark. `violet` and `yellow` were added in spec-v0.1.485; no earlier name changed meaning. `blue` is no longer used by a row.
