import { describe, expect, test } from "bun:test"
import ts from "typescript"
import { fileURLToPath } from "node:url"
import { readFileSync } from "node:fs"
import { baselineProblems, i18nFindings, listSourceFiles, type Allow, type Baseline } from "./i18nLints"
import { KIT_LOCALES } from "./kitLocales"
import { relative } from "node:path"

// I18N-K1. The kit's strings go through i18n._ (src/i18n.ts). This gate fails when a user-visible English string appears
// outside the call, when a baseline count grows or goes stale, and when a catalog drifts from the source.

const SRC = fileURLToPath(new URL(".", import.meta.url))
const LOCALES = fileURLToPath(new URL("../locales/", import.meta.url))
const baseline = JSON.parse(readFileSync(new URL("./i18n-baseline.json", import.meta.url), "utf8")) as Baseline
const allow = JSON.parse(readFileSync(new URL("./i18n-allowlist.json", import.meta.url), "utf8")) as Allow[]

describe("kit strings", () => {
  const findings = i18nFindings(SRC, undefined, allow)

  test("no file gained a hardcoded string, no new file has any, and a fixed file left the baseline", () => {
    expect(baselineProblems(findings, baseline)).toEqual([])
  })

  test("every allowlist entry is still needed and says why", () => {
    const all = i18nFindings(SRC, undefined, [])
    for (const entry of allow) {
      expect(entry.reason.length, entry.text).toBeGreaterThanOrEqual(20)
      expect(all.some((f) => f.file === entry.file && f.text === entry.text), `${entry.file}: ${entry.text}`).toBe(true)
    }
  })
})

describe("the scanner", () => {
  const scan = (src: string, allowlist: Allow[] = []) => i18nFindings("x", { "a.tsx": src }, allowlist).map((f) => f.text)

  test("catches plain text, text props, label objects, toast calls and strings in expressions", () => {
    expect(scan("const A = () => <button>Save</button>")).toEqual(["Save"])
    expect(scan('const A = () => <input placeholder="Search" />')).toEqual(["Search"])
    expect(scan('toast.success("Saved")')).toEqual(["Saved"])
    expect(scan('const o = { label: "Reset to default" }')).toEqual(["Reset to default"])
    expect(scan("const A = () => <p>{ok ? 'Done' : 'Not done'}</p>")).toEqual(["Done", "Not done"])
  })

  test("passes the same lines inside i18n._, and numbers, symbols, class names and allowlisted names", () => {
    expect(scan('const A = () => <button>{i18n._({ id: "ui.Save", message: "Save" })}</button>')).toEqual([])
    expect(scan('const A = () => <input placeholder={i18n._({ id: "ui.Search", message: "Search" })} />')).toEqual([])
    expect(scan('const A = () => <p className="text-sm font-bold">12 · 3%</p>')).toEqual([])
    expect(scan("const A = () => <b>MaiPai</b>", [{ file: "a.tsx", text: "MaiPai", reason: "the product name" }])).toEqual([])
  })

  test("the baseline only shrinks", () => {
    const f = [{ file: "a.tsx", line: 1, text: "Save" }, { file: "a.tsx", line: 2, text: "Cancel" }]
    expect(baselineProblems(f, { "a.tsx": 2 })).toEqual([])
    expect(baselineProblems(f, { "a.tsx": 3 })[0]).toContain("shrank")
    expect(baselineProblems(f, { "a.tsx": 1 })[0]).toContain("grew")
    expect(baselineProblems(f, {})[0]).toContain("not in the baseline")
  })
})

describe("kit catalogs", () => {
  const poIds = (locale: string): Map<string, string> => {
    const text = readFileSync(`${LOCALES}${locale}/messages.po`, "utf8")
    const map = new Map<string, string>()
    for (const m of text.matchAll(/msgid "((?:[^"\\]|\\.)*)"\nmsgstr "((?:[^"\\]|\\.)*)"/g)) if (m[1]) map.set(m[1], m[2] ?? "")
    return map
  }
  const source = poIds("en-US")
  const placeholders = (s: string) => [...s.matchAll(/\{\s*(\w+)\s*[,}]/g)].map((m) => m[1]).sort()

  test("every i18n._ id in the source is in the en-US catalog, and no stale id remains", () => {
    const used = new Set<string>()
    for (const file of listSourceFiles(SRC)) {
      const ast = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
      const visit = (node: ts.Node) => {
        if (ts.isCallExpression(node) && node.expression.getText(ast) === "i18n._" && node.arguments[0] && ts.isObjectLiteralExpression(node.arguments[0])) {
          const id = node.arguments[0].properties.find((p) => ts.isPropertyAssignment(p) && p.name.getText(ast) === "id")
          const init = id && ts.isPropertyAssignment(id) ? id.initializer : undefined
          expect(init && ts.isStringLiteral(init), `${relative(SRC, file)}: id must be a string literal`).toBe(true)
          if (init && ts.isStringLiteral(init)) used.add(init.text)
        }
        ts.forEachChild(node, visit)
      }
      visit(ast)
    }
    expect([...used].filter((id) => !source.has(id.replace(/"/g, '\\"')) && !source.has(id))).toEqual([])
    expect([...source.keys()].filter((id) => ![...used].some((u) => u === id || u.replace(/"/g, '\\"') === id))).toEqual([])
  })

  test("every id starts with ui. and equals ui. plus its English text (a hand suffix in parentheses is allowed)", () => {
    for (const [id, text] of source) {
      expect(id.startsWith("ui."), id).toBe(true)
      expect(id === `ui.${text}` || id.startsWith(`ui.${text} (`), id).toBe(true)
    }
  })

  test("each locale has a catalog with a Language header, matching placeholders and no em dash", () => {
    for (const locale of KIT_LOCALES) {
      const text = readFileSync(`${LOCALES}${locale}/messages.po`, "utf8")
      expect(text).toContain(`"Language: ${locale}\\n"`)
      expect(text.includes("—"), `${locale} has an em dash`).toBe(false)
      for (const [id, msgstr] of poIds(locale)) {
        if (!msgstr) continue
        expect(placeholders(msgstr), `${locale}: ${id}`).toEqual(placeholders(source.get(id) ?? ""))
      }
    }
  })

  test("the compiled catalogs hold the same ids as the sources, with the fallback chain merged in", async () => {
    for (const locale of KIT_LOCALES) {
      const compiled = (await import(`../locales/${locale}/messages`)) as { messages: Record<string, unknown> }
      expect(Object.keys(compiled.messages).sort(), `${locale}: run bun run i18n:compile`).toEqual([...source.keys()].map((id) => id.replace(/\\"/g, '"')).sort())
    }
  })

  test("every Spanish entry written by the model is flagged needs-review", () => {
    const text = readFileSync(`${LOCALES}es/messages.po`, "utf8")
    const blocks = text.split("\n\n").filter((b) => /^msgstr "(?!")/m.test(b) && b.includes("msgid"))
    const unflagged = blocks.filter((b) => !b.includes("needs-review"))
    expect(unflagged.length, "a filled es entry without the needs-review flag").toBe(0)
  })
})
