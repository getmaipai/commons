import { readFileSync } from "node:fs";
import { join } from "node:path";
import { listSourceFiles } from "./fixedColors";

export type PictureAllowEntry = { file: string; match: RegExp; reason: string };
export type PictureFinding = { text: string; line: number };

const RENDERERS = [/<img\b/g, /\bnew\s+Image\s*\(/g, /background-image\s*:\s*url\s*\(/gi];

function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`\\\w])\/\/.*$/gm, (m, pre: string) => pre + " ".repeat(m.length - pre.length));
}

export function findPictureRenderings(source: string): PictureFinding[] {
  const code = withoutComments(source);
  const findings: PictureFinding[] = [];
  for (const pattern of RENDERERS) {
    pattern.lastIndex = 0;
    for (const match of code.matchAll(pattern)) {
      findings.push({ text: match[0], line: code.slice(0, match.index).split("\n").length });
    }
  }
  return findings.sort((a, b) => a.line - b.line);
}

export function scanPictureSource(file: string, source: string, allow: PictureAllowEntry[]) {
  const used = new Set<PictureAllowEntry>();
  const violations: string[] = [];
  for (const finding of findPictureRenderings(source)) {
    const entry = allow.find((item) => item.file === file && item.match.test(finding.text));
    if (entry) used.add(entry);
    else violations.push(`${file}:${finding.line}: ${finding.text}`);
  }
  return { violations, usedAllow: [...used], unusedAllow: allow.filter((item) => item.file === file && !used.has(item)) };
}

/** Content pictures in kit UI are rendered by SafeImage; only these named non-content picture operations remain. */
export const PICTURE_ALLOWLIST: PictureAllowEntry[] = [
  { file: "src/dashboard/layouts/full/shared/logo/FullLogo.tsx", match: /^<img\b/, reason: "The two imported SVG brand marks switch for the active theme and are decorative navigation logos." },
  { file: "src/dashboard/layouts/full/shared/logo/Logo.tsx", match: /^<img\b/, reason: "The imported SVG brand mark is a decorative navigation logo with its accessible name on the link." },
  { file: "src/dashboard/layouts/full/vertical/rail/AppRail.tsx", match: /^<img\b/, reason: "The imported SVG brand marks are decorative navigation logos that switch for the active theme." },
  { file: "src/dashboard/views/auth/authforms/auth-register.tsx", match: /^<img\b/, reason: "The imported SVG brand marks are decorative authentication logos that switch for the active theme." },
  { file: "src/dashboard/views/auth/authforms/auth-login.tsx", match: /^<img\b/, reason: "The imported SVG brand marks are decorative authentication logos that switch for the active theme." },
  { file: "src/dashboard/views/auth/authforms/social-buttons.tsx", match: /^<img\b/, reason: "The imported Google and GitHub SVG marks are decorative; each button already names its provider." },
  { file: "src/elements/image-editor-surface.tsx", match: /^new\s+Image\s*\(/, reason: "The canvas editor decodes source pixels offscreen before drawing them into its editing canvas." },
  { file: "src/elements/generation-stage.tsx", match: /^new\s+Image\s*\(/, reason: "The generation stage preloads the next preview before its crossfade to avoid an empty frame." },
];

export function scanPictureSurfaces(uiRoot: string, allow = PICTURE_ALLOWLIST) {
  const violations: string[] = [];
  const used = new Set<PictureAllowEntry>();
  const roots = ["src/elements/", "src/primitives/", "src/dashboard/"];
  for (const file of listSourceFiles(uiRoot).filter((path) => roots.some((root) => path.startsWith(root)) && path !== "src/primitives/SafeImage.tsx")) {
    const result = scanPictureSource(file, readFileSync(join(uiRoot, "..", file), "utf8"), allow);
    violations.push(...result.violations);
    for (const entry of result.usedAllow) used.add(entry);
  }
  return { violations, unusedAllow: allow.filter((entry) => !used.has(entry)) };
}
