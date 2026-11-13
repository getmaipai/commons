/* SURFACE-SYSTEM-01 (owner bug, 2026-11-13: "the shadows on your modals are
 * square and do not match the rounded of the modal"). The scanner behind
 * surfaceLints.test.ts. A surface's background, border, radius and shadow live
 * on ONE element and come from the surface tokens (`--elev-*`, `--elevation-*`
 * in tokens.css) through the `surface-*` utilities, so a shadow can never sit on
 * a box that has no radius of its own.
 *
 * Findings:
 *   shadow-without-radius   a class string sets a shadow but no radius and no
 *                           `surface-*` utility (the radius is on another element)
 *   shadow-off-tokens       an arbitrary `shadow-[...]` or `drop-shadow-[...]`
 *                           that does not read an elevation token
 *   css-shadow-without-radius  a CSS rule sets `box-shadow` with no `border-radius`
 *                           in the same rule (the global `[data-slot=...]` rule
 *                           that caused the square dialog shadows)
 *   css-shadow-off-tokens   a CSS `box-shadow` value that reads no token
 */
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { stripComments } from "./fixedColors"

export type SurfaceKind = "shadow-without-radius" | "shadow-off-tokens" | "css-shadow-without-radius" | "css-shadow-off-tokens"
export type SurfaceFinding = { kind: SurfaceKind; file: string; line: number; text: string }
export type SurfaceAllow = { file: string; match: RegExp; reason: string }

// `shadow-md`, `hover:shadow-lg`, `shadow-[...]`, `drop-shadow-sm`; `shadow-none` and the shadow colour classes (`shadow-primary/20`) set no box. A dotted id (`option_label.shadow`) or a bare word is prose, not a class.
const SHADOW_CLASS = /(?<![\w.-])((?:[\w-]+:|\[[^\]]+\]:)*)((?:drop-)?shadow-(?!none(?![\w-]))[\w./[\]()%:,-]+)(?![\w-])/g
const RADIUS_CLASS = /(?<![\w-])(?:[\w-]+:|\[[^\]]+\]:)*(?:rounded(?:-[\w./[\]()-]+)?|surface-(?:card|float|menu|dialog|sheet|sheet-bottom))(?![\w-])/
const SHADOW_COLOR_ONLY = /^(?:drop-)?shadow-(?:inherit|current|transparent|(?:primary|secondary|foreground|background|destructive|muted|accent|popover|card|ring|border)(?:\/[\d.[\]%]+)?)$/
const ELEVATION_TOKEN = /var\(--(?:elev|elevation|shadow)[\w-]*\)/

/** Every quoted string in a TS/TSX source that mentions a shadow, with its line and the text of the bracket pair around it (the `cn(...)` call or the `className={...}` expression that joins it with its sibling strings). */
function strings(source: string): { text: string; line: number; around: string }[] {
  const out: { text: string; line: number; around: string }[] = []
  const re = /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g
  for (let m = re.exec(source); m; m = re.exec(source)) {
    const text = m[1] ?? m[2] ?? m[3] ?? ""
    if (!/shadow/.test(text)) continue
    out.push({ text, line: source.slice(0, m.index).split("\n").length, around: enclosing(source, m.index) })
  }
  return out
}

function enclosing(source: string, at: number): string {
  let depth = 0
  let start = -1
  for (let i = at - 1; i >= 0 && at - i < 4000; i--) {
    const c = source[i]
    if (c === ")" || c === "]" || c === "}") depth++
    else if (c === "(" || c === "[" || c === "{") {
      if (depth === 0) { start = i; break }
      depth--
    }
  }
  if (start < 0) return ""
  depth = 0
  for (let i = start; i < source.length && i - start < 6000; i++) {
    const c = source[i]
    if (c === "(" || c === "[" || c === "{") depth++
    else if (c === ")" || c === "]" || c === "}") {
      depth--
      if (depth === 0) return source.slice(start, i + 1)
    }
  }
  return source.slice(start, start + 6000)
}

export function findClassShadows(source: string): { kind: SurfaceKind; line: number; text: string }[] {
  const found: { kind: SurfaceKind; line: number; text: string }[] = []
  for (const { text, line, around } of strings(stripComments(source, false))) {
    const shadows = [...text.matchAll(SHADOW_CLASS)].map((m) => ({ all: m[0], cls: m[2] ?? "" })).filter((m) => !SHADOW_COLOR_ONLY.test(m.cls))
    if (shadows.length === 0) continue
    for (const m of shadows) {
      if (/shadow-\[/.test(m.cls) && !ELEVATION_TOKEN.test(m.cls)) found.push({ kind: "shadow-off-tokens", line, text: m.all })
    }
    // A box shadow must carry its radius: in the same string or in the expression that joins it. `drop-shadow` follows the painted alpha, so it needs none.
    const boxShadow = shadows.some((m) => !m.cls.startsWith("drop-"))
    if (boxShadow && !RADIUS_CLASS.test(text) && !RADIUS_CLASS.test(around.replace(/["'`]/g, " ").replace(/\s+/g, " "))) {
      found.push({ kind: "shadow-without-radius", line, text: text.length > 90 ? `${text.slice(0, 90)}...` : text })
    }
  }
  return found
}

/** CSS rules with their bodies, nested at-rules flattened. */
function cssRules(css: string): { selector: string; body: string; line: number }[] {
  const out: { selector: string; body: string; line: number }[] = []
  const src = stripComments(css, true)
  const re = /([^{};]+)\{([^{}]*)\}/g
  for (let m = re.exec(src); m; m = re.exec(src)) {
    out.push({ selector: (m[1] ?? "").trim(), body: m[2] ?? "", line: src.slice(0, m.index + m[0].indexOf("{")).split("\n").length })
  }
  return out
}

export function findCssShadows(css: string): { kind: SurfaceKind; line: number; text: string }[] {
  const found: { kind: SurfaceKind; line: number; text: string }[] = []
  for (const rule of cssRules(css)) {
    if (/^@(?:keyframes|font-face)/.test(rule.selector)) continue
    if (/^\d+%$|^(?:from|to)$/.test(rule.selector)) continue // keyframe steps animate a shadow, they style no box
    for (const decl of rule.body.matchAll(/(?<![\w-])box-shadow\s*:\s*([^;}]+)/g)) {
      const value = (decl[1] ?? "").trim()
      if (/^(?:none|inherit|initial|unset)$/.test(value)) continue
      // The value is the tokens and nothing else: `var(--elev-3-shadow)`, `var(--elevation-1), var(--elevation-hairline)`.
      if (!/^var\(--(?:elev|elevation|shadow)[\w-]*\)(?:\s*,\s*var\(--(?:elev|elevation|shadow)[\w-]*\))*$/.test(value)) {
        found.push({ kind: "css-shadow-off-tokens", line: rule.line, text: `${rule.selector}: ${value}` })
      }
      if (!/(?<![\w-])border-radius\s*:/.test(rule.body)) found.push({ kind: "css-shadow-without-radius", line: rule.line, text: `${rule.selector}: ${value}` })
    }
  }
  return found
}

function listFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "__snapshots__" || name === "surfaceLints.ts" || name === "fixedColors.ts") continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) listFiles(path, out)
    else if (/\.(?:tsx?|css)$/.test(name) && !/\.(?:test|d)\.tsx?$/.test(name)) out.push(path)
  }
  return out
}

/** Scan the kit source. `allow` entries are the only places a finding may stay; a stale entry (nothing matches it) is the caller's to fail. */
export function scanSurfaces(root: string, allow: SurfaceAllow[], sources?: Record<string, string>): { findings: SurfaceFinding[]; unused: SurfaceAllow[] } {
  const files = sources ?? Object.fromEntries(listFiles(root).map((p) => [relative(join(root, ".."), p), readFileSync(p, "utf8")]))
  const used = new Set<SurfaceAllow>()
  const findings: SurfaceFinding[] = []
  for (const [file, source] of Object.entries(files)) {
    const raw = /\.css$/.test(file) ? findCssShadows(source) : findClassShadows(source)
    for (const f of raw) {
      const hit = allow.find((a) => a.file === file && a.match.test(f.text))
      if (hit) used.add(hit)
      else findings.push({ ...f, file })
    }
  }
  return { findings, unused: allow.filter((a) => !used.has(a)) }
}
