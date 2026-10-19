/* NO-FIXED-COLORS-01 (owner rule: "we shouldn't have fixed colors anywhere,
 * should follow the user's selected theme"). The scanner behind
 * fixedColors.test.ts: it finds color literals and Tailwind palette classes in
 * the kit's source. Everything the kit draws reads a theme token (--background,
 * --foreground, --primary, --destructive, --status-*, --chart-*, ...) or a
 * color-mix of tokens, so a look and a mode change it. */
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"

const PALETTE =
  "slate|gray|grey|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose"
const UTILITY =
  "bg|text|border|border-[xytblrse]|ring|ring-offset|stroke|fill|decoration|caret|outline|from|via|to|shadow|accent|divide|placeholder"
const NAMED =
  "white|black|red|blue|green|gray|grey|orange|yellow|purple|pink|silver|navy|teal|cyan|magenta|maroon|gold|lime|aqua"
// `color:` alone also names a data field in TS (a project's hue name, a stroke color name), so there only white and black count.
const COLOR_PROPS =
  "background|background-color|fill|stroke|border-color|outline-color|caret-color|stop-color|fillStyle|strokeStyle|backgroundColor|stopColor"

export type ColorKind = "hex" | "function" | "named" | "palette-class" | "arbitrary-class"
export type Finding = { kind: ColorKind; text: string; line: number }

const PATTERNS: { kind: ColorKind; re: RegExp }[] = [
  // #fff, #ffff, #ffffff, #ffffffff, not preceded by a word character (so `item#1a` and `&#x1F;` pass) or a `/` (URL fragment).
  { kind: "hex", re: /(?<![\w&/])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![\w-])/g },
  // rgb( rgba( hsl( hsla( hwb( lab( lch( oklab( oklch( color( literals; relative colors (`oklch(from var(--x) ...)`) derive from a token and pass.
  { kind: "function", re: /(?<![\w-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\((?!\s*from\b)/g },
  // A named color where a color is expected: `color: white`, `fill = "black"`, `color-mix(in srgb, black 25%, ...)`.
  { kind: "named", re: new RegExp(`(?<![\\w-])(?:${COLOR_PROPS})\\s*[:=]\\s*["']?(?:${NAMED})(?![\\w-])`, "g") },
  { kind: "named", re: /(?<![\w-])color\s*[:=]\s*["']?(?:white|black)(?![\w-])/g },
  { kind: "named", re: new RegExp(`color-mix\\([^;{}]*?[\\s,](?:${NAMED})(?![\\w-])`, "g") },
  // Tailwind palette classes: bg-blue-500, text-slate-200/50, dark:from-red-400, hover:bg-black/50, text-white. Variants may carry [..] and ( ) .
  {
    kind: "palette-class",
    re: new RegExp(
      `(?<![\\w-])(?:${UTILITY})-(?:(?:${PALETTE})-\\d{2,3}|black|white)(?![\\w-])(?:\\/(?:\\[[\\d.]+\\]|\\d+))?`,
      "g",
    ),
  },
  // Arbitrary color values: bg-[#123456], text-[rgb(1,2,3)], border-[color:#fff].
  {
    kind: "arbitrary-class",
    re: new RegExp(`(?<![\\w-])(?:${UTILITY})-\\[(?:color:)?(?:#|rgba?\\(|hsla?\\(|oklch\\(|oklab\\()[^\\]]*\\]`, "g"),
  },
]

/** Blank out comments, keeping line numbers. CSS: block comments. TS/TSX: block comments and line comments. */
export function stripComments(source: string, css: boolean): string {
  const blank = (s: string) => s.replace(/[^\n]/g, " ")
  let out = source.replace(/\/\*[\s\S]*?\*\//g, blank)
  if (!css) out = out.replace(/(^|[^:"'`\\\w])\/\/.*$/gm, (m, pre: string) => pre + " ".repeat(m.length - pre.length))
  return out
}

/** CSS custom-property declarations (`--x: <value>;`) are where a token is defined, so token files may hold literals there. Blank them. */
function blankCustomProperties(css: string): string {
  return css.replace(/(^|[;{}\s])(--[\w-]+)\s*:[^;{}]*(?=[;}])/g, (m, pre: string) => pre + m.slice(pre.length).replace(/[^\n]/g, " "))
}

export function findColors(source: string, opts: { css: boolean; definitions?: boolean }): Finding[] {
  let code = stripComments(source, opts.css)
  if (opts.definitions) code = blankCustomProperties(code)
  const found: Finding[] = []
  for (const { kind, re } of PATTERNS) {
    re.lastIndex = 0
    for (const m of code.matchAll(re)) {
      const line = code.slice(0, m.index).split("\n").length
      found.push({ kind, text: m[0], line })
    }
  }
  return found.sort((a, b) => a.line - b.line)
}

/** Token definition files: a color literal is allowed on the right of `--name:` here, nowhere else. */
export const DEFINITION_FILES = ["src/tokens.css", "src/dashboard/css/globals.css", "src/elements/globals.css"]

/** Blocks of a definition file that must hold no literal at all, custom properties included (derived from the look's tokens). */
export const STRICT_BLOCKS: { file: string; name: string; from: string; to: string }[] = [
  { file: "src/tokens.css", name: "cinema page tone", from: ':root:has([data-page-tone="cinema"]) {', to: "/* MEDIA-BOOKS-01" },
  { file: "src/tokens.css", name: "art tokens", from: "/* MEDIA-PLAYER-01: tokens for anything drawn over a picture", to: "/* MEDIA-POLISH-01: the cinema page tone" },
]

export type AllowEntry = { file: string; match: RegExp; reason: string }

export function listSourceFiles(root: string): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name)
      if (statSync(p).isDirectory()) walk(p)
      else if (/\.(tsx?|css)$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name) && !/\.d\.ts$/.test(name)) out.push(relative(join(root, ".."), p).replaceAll("\\", "/"))
    }
  }
  walk(root)
  return out.sort()
}

export function scanKit(uiRoot: string, allow: AllowEntry[]) {
  const violations: string[] = []
  const used = new Set<AllowEntry>()
  const read = (rel: string) => readFileSync(join(uiRoot, "..", rel), "utf8")
  for (const rel of listSourceFiles(uiRoot)) {
    const css = rel.endsWith(".css")
    const definitions = DEFINITION_FILES.includes(rel)
    for (const f of findColors(read(rel), { css, definitions })) {
      const entry = allow.find((a) => a.file === rel && a.match.test(f.text))
      if (entry) used.add(entry)
      else violations.push(`${rel}:${f.line}: ${f.kind} ${f.text}`)
    }
  }
  for (const b of STRICT_BLOCKS) {
    const src = read(b.file)
    const start = src.indexOf(b.from)
    const end = src.indexOf(b.to, start)
    if (start < 0 || end < 0) {
      violations.push(`${b.file}: strict block "${b.name}" markers not found (update STRICT_BLOCKS in fixedColors.ts)`)
      continue
    }
    for (const f of findColors(src.slice(start, end), { css: true })) {
      violations.push(`${b.file}: ${b.name}: ${f.kind} ${f.text}`)
    }
  }
  return { violations, unusedAllow: allow.filter((a) => !used.has(a)) }
}
