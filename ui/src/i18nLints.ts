/* I18N-K1. The scanner behind i18nLints.test.ts: it finds user-visible English the kit renders outside the translation
 * call. The same idea as Home's frontend/src/dev/i18nLints.ts (JSX text, text props, toast calls) plus what the kit
 * needs: string-valued label-like object properties and `.ts` files. A string is covered when it sits inside
 * `i18n._(...)`, `<Trans>`, or `msg(...)`. i18n-baseline.json holds the per-file count of what is not converted yet and
 * only shrinks. */
import ts from "typescript"
import { readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"

export type Finding = { file: string; line: number; text: string }
export type Baseline = Record<string, number>
export type Allow = { file: string; text: string; reason: string }

export function listSourceFiles(root: string, dir = root): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : listSourceFiles(root, path)
    return /\.tsx?$/.test(entry.name) && !/\.(test|d)\.tsx?$/.test(entry.name) ? [path] : []
  })
}

const TEXT_PROPS = new Set([
  "title", "label", "placeholder", "aria-label", "alt", "description", "hint", "tooltip", "caption", "subtitle",
  "heading", "message", "text", "emptyText", "ariaLabel", "helperText", "errorText", "confirmLabel", "cancelLabel",
])
const OBJECT_PROPS = new Set([
  "title", "label", "placeholder", "ariaLabel", "description", "hint", "tooltip", "caption", "subtitle", "heading",
  "emptyText", "helperText", "errorText", "confirmLabel", "cancelLabel", "message",
])
const WORDS = /[A-Za-z]{2,}/
/** JSX text is user-facing when it holds a word. A string in a prop or object counts when it has a space or reads like a sentence or a capitalised word (so ids, paths, enum values and class names pass). */
const looksUserFacing = (value: string, jsx = false): boolean => {
  const v = value.replace(/\s+/g, " ").trim()
  return WORDS.test(v) && (jsx || /\s/.test(v) || /^[A-Z][a-z]+[.!?…]?$/.test(v))
}

function literalTexts(node: ts.Expression): string[] {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [node.text]
  if (ts.isTemplateExpression(node)) return [node.head.text + node.templateSpans.map((s) => s.literal.text).join(" ")]
  if (ts.isConditionalExpression(node)) return [...literalTexts(node.whenTrue), ...literalTexts(node.whenFalse)]
  if (ts.isParenthesizedExpression(node)) return literalTexts(node.expression)
  if (ts.isBinaryExpression(node) && (node.operatorToken.kind === ts.SyntaxKind.BarBarToken || node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken))
    return [...literalTexts(node.left), ...literalTexts(node.right)]
  return []
}

export function i18nFindings(srcRoot: string, overrides?: Record<string, string>, allowlist: Allow[] = []): Finding[] {
  const sources = overrides ?? Object.fromEntries(listSourceFiles(srcRoot).map((file) => [relative(srcRoot, file), readFileSync(file, "utf8")]))
  const findings: Finding[] = []
  for (const [file, text] of Object.entries(sources)) {
    const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
    const allowed = (value: string) => allowlist.some((entry) => entry.file === file && entry.text === value && entry.reason.trim())
    const report = (node: ts.Node, raw: string, jsx = false) => {
      const value = raw.replace(/\s+/g, " ").trim()
      if (looksUserFacing(value, jsx) && !allowed(value))
        findings.push({ file, line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1, text: value })
    }
    const visit = (node: ts.Node, covered = false) => {
      const tag = ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node) ? node.tagName.getText(ast) : ""
      const isCall =
        ts.isCallExpression(node) &&
        (node.expression.getText(ast) === "i18n._" || node.expression.getText(ast) === "msg" || node.expression.getText(ast) === "kitText")
      const here = covered || tag === "Trans" || isCall
      if (!here) {
        if (ts.isJsxText(node)) report(node, node.text, true)
        if (ts.isJsxAttribute(node) && TEXT_PROPS.has(node.name.getText(ast)) && node.initializer) {
          const init = node.initializer
          if (ts.isStringLiteral(init)) report(node, init.text)
          else if (ts.isJsxExpression(init) && init.expression) for (const value of literalTexts(init.expression)) report(node, value)
        }
        if (ts.isJsxExpression(node) && node.expression && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent)))
          for (const value of literalTexts(node.expression)) report(node, value)
        if (ts.isPropertyAssignment(node) && OBJECT_PROPS.has(node.name.getText(ast).replace(/^["']|["']$/g, "")))
          for (const value of literalTexts(node.initializer)) report(node, value)
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.expression.getText(ast) === "toast" && node.arguments[0])
          for (const value of literalTexts(node.arguments[0])) report(node, value)
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "setError" && node.arguments[0])
          for (const value of literalTexts(node.arguments[0])) report(node, value)
      }
      ts.forEachChild(node, (child) => visit(child, here))
    }
    visit(ast)
  }
  return findings
}

export function countByFile(findings: Finding[]): Baseline {
  const counts: Baseline = {}
  for (const finding of findings) counts[finding.file] = (counts[finding.file] ?? 0) + 1
  return counts
}

/** Empty when the counts match the baseline's promise: no file grew, no new file has any, and a fixed file left the baseline. */
export function baselineProblems(findings: Finding[], baseline: Baseline): string[] {
  const counts = countByFile(findings)
  const problems = Object.entries(counts).flatMap(([file, count]) =>
    baseline[file] === undefined
      ? [`${file} has ${count} hardcoded strings and is not in the baseline`]
      : count > baseline[file]!
        ? [`${file} grew from ${baseline[file]} to ${count}`]
        : [],
  )
  for (const [file, count] of Object.entries(baseline)) if ((counts[file] ?? 0) < count) problems.push(`${file} shrank from ${count} to ${counts[file] ?? 0}; shrink its baseline`)
  return problems
}
