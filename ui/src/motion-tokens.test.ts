// MOTION-01: the one motion system. Pins the tokens, the families (reveal, rise, fade, list utilities; slide and collapse on the
// same tokens), reduced motion, and that every overlay primitive takes its animation from the shared utilities, not a copied recipe.
import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8")
const css = read("./tokens.css")

describe("motion tokens", () => {
  test("every duration, easing, distance and scale token exists", () => {
    for (const t of [
      "--motion-ease-out", "--motion-ease-in", "--motion-ease-slide",
      "--motion-reveal-in: 140ms", "--motion-reveal-out: 100ms", "--motion-reveal-distance: 6px", "--motion-reveal-scale: 0.96",
      "--motion-rise-in: 220ms", "--motion-rise-out: 150ms", "--motion-rise-distance: 12px", "--motion-rise-scale: 0.97",
      "--motion-slide-in: 260ms", "--motion-slide-out: 180ms", "--motion-collapse-in: 220ms", "--motion-collapse-out: 160ms",
      "--motion-fade-in: 160ms", "--motion-fade-out: 110ms", "--motion-list-in: 200ms",
    ]) expect(css, t).toContain(t)
  })

  test("exit is about 70 percent of enter or quicker, and small overlays stay inside 120 to 160 ms", () => {
    const ms = (n: string) => Number(new RegExp(`--motion-${n}: (\\d+)ms`).exec(css)![1])
    for (const f of ["reveal", "rise", "slide", "collapse", "fade"]) expect(ms(`${f}-out`) / ms(`${f}-in`)).toBeLessThanOrEqual(0.75)
    expect(ms("reveal-in")).toBeGreaterThanOrEqual(120)
    expect(ms("reveal-in")).toBeLessThanOrEqual(160)
  })

  test("reduced motion and calm remove distance and scale", () => {
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{\s*:root:root \{[^}]*--motion-reveal-distance: 0px[^}]*--motion-reveal-scale: 1/)
    expect(css).toMatch(/html\[data-ease-motion="calm"\] body \{[^}]*--motion-rise-distance: 0px/)
  })

  test("the reveal moves only opacity and transform and reads the side and origin from the trigger", () => {
    const util = /@utility motion-reveal \{[\s\S]*?\n\}/.exec(css)![0]
    expect(util).toContain("--radix-popper-transform-origin")
    expect(util).toContain("--transform-origin")
    for (const side of ["top", "bottom", "left", "right"]) expect(util).toContain(`data-side="${side}"`)
    expect(util).toContain('[data-state="closed"]')
    expect(util).toContain("[data-closed]")
    const frames = /@keyframes motion-reveal-in \{[\s\S]*?\n\}/.exec(css)![0]
    expect(frames).not.toMatch(/(width|height|top|left|margin)/)
  })
})

describe("primitives use the shared reveal", () => {
  const floating = ["ui/dropdown-menu", "ui/popover", "ui/select", "ui/tooltip", "ui/hover-card", "dashboard/components/ui/dropdown-menu", "dashboard/components/ui/popover", "dashboard/components/ui/select", "dashboard/components/ui/tooltip", "dashboard/components/ui/hover-card", "dashboard/components/ui/context-menu", "dashboard/components/ui/menubar", "dashboard/components/ui/combobox", "elements/composer-trigger-popover.aui"]
  const modal = ["ui/dialog", "ui/alert-dialog", "dashboard/components/ui/dialog", "dashboard/components/ui/alert-dialog"]
  test("floating surfaces carry motion-reveal and none keeps a copied recipe", () => {
    for (const f of floating) {
      const src = read(`./${f}.tsx`)
      expect(src, f).toContain("motion-reveal")
      expect(src, f).not.toMatch(/zoom-in-95|slide-in-from-(top|bottom|left|right)-2|animate-in/)
    }
  })
  test("modals rise, backdrops fade", () => {
    for (const f of modal) {
      const src = read(`./${f}.tsx`)
      expect(src, f).toContain("motion-rise")
      expect(src, f).toContain("motion-fade")
      expect(src, f).not.toMatch(/zoom-in-95|animate-in/)
    }
    for (const f of ["ui/sheet", "ui/drawer", "dashboard/components/ui/sheet"]) expect(read(`./${f}.tsx`), f).toMatch(/motion-fade|--motion-fade-in/)
  })
  test("sheets and sidebars slide on the slide tokens, never a hard-coded duration", () => {
    for (const f of ["ui/sheet", "dashboard/components/ui/sheet"]) expect(read(`./${f}.tsx`), f).toContain("--motion-slide-in")
    for (const f of ["ui/sidebar", "dashboard/components/ui/sidebar", "elements/ui/sidebar", "elements/thread-list-sidebar.aui", "primitives/SectionSidebar", "dashboard/layouts/full/vertical/rail/AppRail"]) {
      const src = read(`./${f}.tsx`)
      expect(src, f).toContain("--motion-slide-in")
      expect(src, f).not.toContain("duration-200 ease-linear")
    }
  })
})

describe("motion phase 2", () => {
  test("sheet, viewer, loaded utilities and the third-party overrides exist", () => {
    for (const t of ["@utility motion-sheet-bottom", "@utility motion-viewer-in", "@utility motion-viewer-out", "@utility motion-loaded", "[data-sonner-toaster] [data-sonner-toast]"]) expect(css, t).toContain(t)
    expect(css).toMatch(/\[data-sonner-toast\]\[data-removed="true"\] \{[^}]*--motion-slide-out/)
  })
  test("disclosures run on the collapse token and the slide curve, not a hard-coded duration", () => {
    for (const f of ["assistant-ui/tool-fallback.aui", "elements/tool-fallback.aui", "elements/tool-group.aui", "elements/reasoning"]) {
      const src = read(`./${f}.tsx`)
      expect(src, f).toContain('"var(--motion-collapse-in)"')
      expect(src, f).not.toContain("cubic-bezier(0.32,0.72,0,1)")
    }
  })
  test("the vaul drawer takes the slide durations", () => {
    expect(read("./ui/drawer.tsx")).toContain("--motion-slide-in")
  })
  test("a plain dialog is a bottom sheet below sm, in both dialog sets", () => {
    for (const f of ["ui/dialog", "dashboard/components/ui/dialog"]) {
      const src = read(`./${f}.tsx`)
      expect(src, f).toContain("max-sm:motion-sheet-bottom")
      expect(src, f).toContain("max-sm:bottom-0")
      expect(src, f).toContain("max-sm:before:")
    }
  })
  test("the media viewer grows from its thumbnail", () => {
    const src = read("./elements/media-viewer.tsx")
    expect(src).toContain("--viewer-from")
    expect(src).toContain("data-[state=open]:motion-viewer-in")
  })
  test("live lists flag inserted rows", () => {
    for (const f of ["primitives/RunningNow", "elements/activity-feed", "elements/result-feed", "primitives/MediaShelf"]) {
      const src = read(`./${f}.tsx`)
      expect(src, f).toContain("useInsertedKeys")
      expect(src, f).toContain("motion-list")
    }
  })
})
