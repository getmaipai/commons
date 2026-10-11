// Additive Source.detail (KS-02F-KIT): its own wrapping line, and no change
// to the rendered output when it is absent.
import { describe, expect, test, afterEach } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { Sources } from "./sources";
import { Citation } from "./inline-citation";

afterEach(cleanup);

const licence = "CC BY-SA 4.0, snapshot 2026-09-01, adapted from the English Wikipedia article";
const base = { domain: "en.wikipedia.org", title: "Aurora" };

function html(layout: "list" | "grid", detail?: string) {
  const { container } = render(
    <Sources sources={[{ ...base, ...(detail ? { detail } : {}) }]} open onOpenChange={() => {}} layout={layout} hideTrigger />,
  );
  return container;
}

describe("Source.detail", () => {
  test("list: renders as its own wrapping line, not inside the truncated domain", () => {
    const c = html("list", licence);
    const d = c.querySelector('[data-slot="source-detail"]') as HTMLElement;
    expect(d.textContent).toBe(licence);
    expect(d.className).not.toContain("truncate");
    expect(d.className).toContain("basis-full");
    expect(d.previousElementSibling?.textContent).toBe("en.wikipedia.org");
    expect(c.querySelector('[data-slot="sources-list"] > div')?.className).toContain("flex-wrap");
  });

  test("grid: renders under the title", () => {
    const d = html("grid", licence).querySelector('[data-slot="source-detail"]') as HTMLElement;
    expect(d.textContent).toBe(licence);
    expect(d.previousElementSibling?.textContent).toBe("Aurora");
  });

  test("absent: no detail element and the row classes are the pre-detail ones", () => {
    for (const layout of ["list", "grid"] as const) {
      expect(html(layout).querySelector('[data-slot="source-detail"]')).toBeNull();
      cleanup();
    }
    const row = html("list").querySelector('[data-slot="sources-list"] > div') as HTMLElement;
    expect(row.className).toBe("flex items-center gap-2 rounded-lg px-1 py-1");
  });

  test("Citation popup shows detail under the title when set", () => {
    render(<Citation index={0} source={{ ...base, detail: licence }} open onOpenChange={() => {}} />);
    expect(document.body.textContent).toContain(licence);
  });
});
