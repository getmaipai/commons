// PRO-LOOK-STUDIOS-01: studio structure stays scoped, while selected Look and appearance tokens flow through.
import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { renderWithQueryClient } from "../tests/renderWithQueryClient";
import { NodeRenderer } from "@/kit/schema/NodeRenderer";
import { PageNodeSchema } from "@/kit/schema/types";

afterEach(cleanup);

const css = readFileSync(resolve(import.meta.dir, "tokens.css"), "utf8");
const studioRule = css.match(/\[data-surface="studio"\]\s*\{[^}]*\}/)?.[0] ?? "";
const darkStudioRule = css.match(/html\.dark \[data-surface="studio"\]\s*\{[^}]*\}/)?.[0] ?? "";

describe("the studio token scope", () => {
  test("inherits color and surface roles from the active Look and appearance", () => {
    expect(studioRule).toContain("--prompt-panel-offset: 14rem;");
    expect(studioRule).not.toMatch(/--(?:background|card|foreground|primary|ring|muted|border|input)\s*:/);
    expect(darkStudioRule).toContain("--surface-stage:");
    expect(darkStudioRule).not.toMatch(/--(?:background|card|foreground|primary|ring|muted|border|input)\s*:/);
    expect(css).not.toMatch(/:root:not\(\.light\):not\(\.dark\)\s*\[data-surface="studio"\]/);
  });

  test("a studio-scoped stage is derived from the selected page and text colors", () => {
    expect(studioRule).toMatch(/--surface-stage:\s*color-mix\(in srgb, var\(--surface-page\), var\(--foreground\) 6%\);/);
    expect(darkStudioRule).toMatch(/--surface-stage:\s*color-mix\(in srgb, var\(--surface-page\), black 40%\);/);
  });

  test("no Look selector targets the studio scope", () => {
    expect(css).not.toMatch(/style-[a-z-]+[^{}]*\[data-surface="studio"\]/);
    expect(css).not.toMatch(/data-look[^{}]*\[data-surface="studio"\]\s*\{/);
  });
});

describe("page.surface: studio", () => {
  const body = [{ type: "empty_state" as const, icon: "film", text: "Nothing yet" }];
  const render = (surface?: "page" | "studio") =>
    renderWithQueryClient(<MemoryRouter><NodeRenderer node={PageNodeSchema.parse({ type: "page", id: "x", title: "X", ...(surface ? { surface } : {}), body })} /></MemoryRouter>);

  test("studio draws the body in one pane that carries the scope, rounded from lg and full bleed on a phone", () => {
    const { container } = render("studio");
    const pane = container.querySelector('[data-surface="studio"]') as HTMLElement;
    expect(pane).not.toBeNull();
    expect(pane.textContent).toContain("Nothing yet");
    expect(pane.className).toContain("lg:rounded-3xl");
    expect(pane.className).toContain("-mx-4");
    expect(pane.className).toContain("lg:mx-0");
  });

  test("the default and page draw no pane", () => {
    expect(render().container.querySelector("[data-surface]")).toBeNull();
    cleanup();
    expect(render("page").container.querySelector("[data-surface]")).toBeNull();
  });
});
