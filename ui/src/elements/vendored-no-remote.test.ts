import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// ELT-T1-K01a: nothing vendored from assistant-ui may phone home. No remote
// image, font, link or script default ships in any of these files (D15).
const VENDORED = [
  "composer-attachments.aui.tsx",
  "composer-context.aui.tsx",
  "composer-mentions.aui.tsx",
  "composer-model-picker.aui.tsx",
  "composer-slash-commands.aui.tsx",
  "composer-trigger-popover.aui.tsx",
  "composer-voice.aui.tsx",
  "quote.aui.tsx",
  "option-list.tsx",
  "question-flow.tsx",
  "heat-graph.tsx",
];

function code(file: string): string {
  return readFileSync(join(import.meta.dir, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

describe("vendored Elements carry no external URL default", () => {
  for (const file of VENDORED) {
    test(`${file} has no http(s) URL, remote import or inline hex color`, () => {
      const source = code(file);
      expect(source).not.toMatch(/https?:\/\//);
      expect(source).not.toMatch(/from\s+["']https?:/);
      expect(source).not.toMatch(/["']#[0-9a-fA-F]{6}["']/);
      expect(source).not.toMatch(/\bfetch\(|XMLHttpRequest|new WebSocket|sendBeacon/);
    });
  }
});
