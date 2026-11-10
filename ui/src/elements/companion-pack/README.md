# Companion pack player

`CompanionPackPlayer` takes a parsed `CompanionPack`-shaped value, a pack `baseUrl`, and a current state. Pass the player into `CompanionStage`'s `character` slot.

```tsx
<CompanionPackPlayer pack={pack} baseUrl="/companions/mimi/" state="idle" />
```

Props include `tier` (`desktop`, `phone`, or `auto`), CSS `size`, deterministic `seed`, `reducedMotion`, `paused`, `onStateSettled`, and optional `layers`. Reduced motion, pause, and sizes at or below 36 px show `pack.rest` as an image.

Clips load lazily, with at most two loads in progress. H.264 video uses a stacked matte and one WebGL texture; phone playback draws at up to 30 fps. A layer's `draw(frame)` runs after the matte pass in the same GL context; `dispose` runs on unmount. Layers can use `clipId`, `mediaTime`, `frameIndex`, state and tier to coordinate later GPU work.

Safari needs muted, inline video and the stacked H.264 matte. The renderer avoids canvas filters and offscreen-only APIs, uses cross-origin video loading only for another-origin packs, and falls back to `rest.webp` if WebGL is unavailable. Serve video with byte-range support.
