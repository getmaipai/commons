# Companion pack player

`CompanionPackPlayer` takes a parsed `CompanionPack`-shaped value, a pack `baseUrl`, and a current state. Pass the player into `CompanionStage`'s `character` slot.

```tsx
<CompanionPackPlayer pack={pack} baseUrl="/companions/mimi/" state="idle" />
```

Props include `tier` (`desktop`, `phone`, or `auto`), CSS `size`, deterministic `seed`, `reducedMotion`, `paused`, `onStateSettled`, and optional `layers`. Reduced motion, pause, and sizes at or below 36 px show `pack.rest` as an image.

Clips load lazily, with at most two loads in progress. H.264 video uses a stacked matte and one WebGL texture; phone playback draws at up to 30 fps. A layer's `draw(frame)` runs after the matte pass in the same GL context; `dispose` runs on unmount. Layers can use `clipId`, `mediaTime`, `frameIndex`, state and tier to coordinate later GPU work.

Safari needs muted, inline video and the stacked H.264 matte. The renderer avoids canvas filters and offscreen-only APIs, uses cross-origin video loading only for another-origin packs, and falls back to `rest.webp` if WebGL is unavailable. Serve video with byte-range support.

## Speaking layers (`speech` prop)

```tsx
<CompanionPackPlayer pack={pack} baseUrl="/companions/man/" state="speak"
  speech={{ cues, loudness, events, emotion: "angry", voiceMode: "shout", clock: () => audio.currentTime - startedAt,
            envelope, text, seed }} />
```

`cues` come from `buildCues`, `loudness` from `buildLoud` (zeros outside shout), `events` from `detectEvents`; `clock` is the audio clock in seconds since the first sample. `emotion` forces a kind (level floor 0.7), `null` turns it off, `"auto"` or undefined reads `text`. `joinAt` keeps shapes already drawn when provisional cues are replaced. While `speech` is set the matte frame is copied to a visible 2D canvas and the demo's layers run on it: mouth (photo flow warp when `pack.mouth.warp`, else tile morph), eyelids, head flows, emotion mix, shoulder shift; `layers` run after. When `speech` becomes undefined everything fades within 90 ms (75 ms ramp) and the 2D canvas is hidden; with no `speech` there is no extra canvas work.

Pack layout read by `pack-loader.ts` (folders named by `pack.mouth`, `pack.head`, `pack.eyes`, `pack.emotion`): `mouth/calm` and `mouth/shout` (`meta.json`, `atlas.webp`, plus `flow.bin.z`, `weight`, `samples`, `rest` for the warp set or `alpha` for tile sets), `head/` (`meta.json`, `weight.webp`, `flow.bin.z`), `eyes/` (`closed`, `half`, `ref`, `ring`, `meta.json`), `emotion/` (`meta.json`, `<kind>.flow.bin.z`, `<kind>.webp`), and `clips/<name>.track.json` (affines `m`, residual `res`). `.z` files are zlib, inflated with `DecompressionStream("deflate")` (`setPackIO` swaps the inflate step). The shout set loads on first need. A missing optional folder turns that layer off. Per-character highlight, blur, stop-motion and shoulder settings are in `profile.ts`.

Cost of the speaking pipeline per frame in WebKit (headless Safari engine, 480 px tile, one pack on the page): man 6.7 ms mean (p95 14), clay 13.5 (p95 17), pixar 6.7 (p95 15); shout lines 7 to 8 ms mean. Timer resolution is 1 ms. Pure 2D canvas readbacks; PACK-09 can move the warps to shaders if needed.

## Still plus parts (voice layer, MAKER-G)

A pack without `states` but with a `voice` layer needs no video. The player draws `voice.base` (or `rest`) and each part (a picture with alpha, placed by `box` in the 480 pixel tile) on one 2D canvas, from the same `state` and `speech` props. Each part lists `effects`; an effect reads one channel: `level` (the speech envelope, 0..1), `cue_energy` (how open the current mouth cue is) or `state` (per-state `drive`: steady `amount`, a `pulse` or `blink` at `hz`, one `beat` when the state is entered). The channel value is shaped by `curve`, followed with `smoothing` (attack and release in ms, calm defaults 60 and 220 for level and cue), scaled by the state's preset `gain`, then mapped onto `scale`, `scaleX`, `scaleY`, `rotate`, `translate`, `opacity`, `brightness` (1 to 2) or `glow` ranges. Motion is clamped (scale 0.05 to 1.5, rotate 15 degrees, translate 24 px). Speak then listen runs the `interrupt` preset for 400 ms. Reduced motion, pause and sizes of 36 px or less show the plain `rest` picture. The maths is in `voice-layer.ts` (no canvas needed to test it); the MaiPai pack is built by `scripts/pack/make_maipai_pack.py` in the Home repo. A video pack's `voice` layer is ignored for now.
