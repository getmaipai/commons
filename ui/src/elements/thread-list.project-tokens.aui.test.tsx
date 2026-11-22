import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

// ELEMENTS-LINT-02: a host sizes the project rows, group labels and the reply action bar through kit tokens only.
const list = readFileSync(new URL("./thread-list.aui.tsx", import.meta.url), "utf8");
const thread = readFileSync(new URL("./thread.aui.tsx", import.meta.url), "utf8");
const tokens = readFileSync(new URL("../tokens.css", import.meta.url), "utf8");

describe("host-settable spacing tokens keep the current look as their defaults", () => {
  test.each([
    ["--aui-thread-list-project-chevron-display,block", list],
    ["--aui-thread-list-project-items-indent,1rem", list],
    ["--aui-thread-list-project-note-padding-x,0.625rem", list],
    ["--aui-thread-list-project-note-font-size,0.75rem", list],
    ["--aui-thread-list-project-show-more-height,2rem", list],
    ["--aui-thread-list-project-show-more-font-size,0.875rem", list],
    ["--aui-thread-list-group-label-pt,1rem", list],
    ["--aui-thread-list-group-label-pt,0.75rem", list],
    ["--aui-thread-list-group-label-first-pt,0.5rem", list],
    ["--aui-thread-list-group-label-pb,0.25rem", list],
    ["--aui-thread-list-group-label-font-size,0.75rem", list],
    ["--aui-assistant-action-bar-min-height,auto", thread],
  ])("%s is read by the part", (needle, source) => {
    expect(source).toContain(needle);
  });

  test("tokens.css documents every token", () => {
    for (const name of ["project-chevron-display", "project-items-indent", "project-note-padding-x", "project-show-more-height", "group-label-pt"]) {
      expect(tokens).toContain(`-${name}`);
    }
    expect(tokens).toContain("--aui-assistant-action-bar-min-height");
  });
});

describe("projects section (default-open prop and inline Show more)", () => {
  test("a host can start every project open", () => {
    expect(list).toContain("projects.defaultOpen === true || holdsActive");
  });
  test("the section lists eight projects then a Show more row", () => {
    expect(list).toContain("PROJECT_LIST_PREVIEW_COUNT = 8");
    expect(list).toContain("aui_thread-list-projects-show-more");
  });
});
