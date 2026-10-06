// KIT-SET-05: the accessibility and look defects Home's APP-SET-02 gate
// found in SettingsShell and SettingsRenderer. Structural rules run through
// axe-core on the real rendered shell (happy-dom has no layout, so the
// colour and size rules are asserted from tokens and class contracts).
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, waitFor } from "@testing-library/react";
import axe from "axe-core";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderWithQueryClient } from "../../tests/renderWithQueryClient";
import { SettingsRenderer } from "./SettingsRenderer";
import { SettingsShell } from "./SettingsShell";
import { ADULT, REGISTRY, area } from "./settingsFixtures";

const originalFetch = globalThis.fetch;
afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
});

const DEFS = [
  { key: "a.one", selector: "boolean", label: "Basic one", help: "Helper text.", lives_in: "person.chat" },
  { key: "a.two", selector: "text", label: "Adv two", level: "advanced", lives_in: "person.chat" },
  { key: "a.three", selector: "boolean", label: "Adv three", level: "advanced", lives_in: "person.chat" },
  { key: "a.four", selector: "boolean", label: "Adv four", level: "advanced", lives_in: "person.chat" },
];

beforeEach(() => {
  globalThis.fetch = (async (path: RequestInfo | URL) => {
    const url = String(path);
    const json = (data: unknown) => ({ ok: true, status: 200, json: async () => data, text: async () => JSON.stringify(data) }) as Response;
    if (url === "/api/settings/registry")
      return json(DEFS.map((d) => ({ scope: "person", level: "basic", secret: false, honoured_by: ["home"], default: d.selector === "boolean" ? false : "", ...d })));
    return json(
      DEFS.map((d) => ({ key: d.key, value: d.selector === "boolean" ? false : "", source: "default", label: d.label, level: (d as { level?: string }).level ?? "basic", secret: false })),
    );
  }) as unknown as typeof fetch;
});

async function renderShell(contentAs?: "main" | "section") {
  const view = renderWithQueryClient(
    <main aria-label="App">
      <SettingsShell
        area={area("chat")}
        viewer={ADULT}
        registry={REGISTRY}
        honouredBy="home"
        activeSection="general"
        onNavigate={() => {}}
        searchQuery=""
        onSearchChange={() => {}}
        contentAs={contentAs}
      >
        <SettingsRenderer scope="person" scopeValue="person:p1" honouredBy="home" />
      </SettingsShell>
    </main>,
  );
  await waitFor(() => expect(view.container.querySelector("[data-slot=item-group]")).not.toBeNull());
  return view;
}

async function violations(container: HTMLElement, rules: string[]) {
  const result = await axe.run(container, { runOnly: { type: "rule", values: rules } });
  return result.violations.map((v) => `${v.id}: ${v.nodes.length}`);
}

describe("KIT-SET-05 structure (axe)", () => {
  test("1 aria-required-children: a card's separators and fold sit in a valid structure", async () => {
    const { container } = await renderShell("section");
    // open the fold so the collapsible, its trigger and separators exist
    const trigger = container.querySelector("[data-slot=collapsible-trigger]");
    expect(trigger).not.toBeNull();
    await act(async () => {
      fireEvent.click(trigger!);
    });
    expect(await violations(container, ["aria-required-children", "aria-required-parent"])).toEqual([]);
  });

  test("2 heading-order: card titles are h2 under the shell's h1", async () => {
    const { container } = await renderShell("section");
    expect(container.querySelector("h1")).not.toBeNull();
    expect(container.querySelectorAll("section h3")).toHaveLength(0);
    expect(container.querySelector("section h2")?.textContent).toBe("Chat");
    expect(await violations(container, ["heading-order"])).toEqual([]);
  });

  test("2b a SettingsRenderer with no shell keeps h3 (unchanged default)", async () => {
    const { container } = renderWithQueryClient(<SettingsRenderer scope="person" scopeValue="person:p1" honouredBy="home" />);
    await waitFor(() => expect(container.querySelector("section h3")).not.toBeNull());
  });

  test("3 landmarks: with contentAs=section there is one main and the pane is a named region", async () => {
    const { container } = await renderShell("section");
    expect(container.querySelectorAll("main")).toHaveLength(1);
    const pane = container.querySelector("[data-slot=settings-content]") as HTMLElement;
    expect(pane.tagName).toBe("SECTION");
    expect(pane.getAttribute("aria-label")).toBe("General");
    expect(await violations(container, ["landmark-main-is-top-level", "landmark-no-duplicate-main", "landmark-unique"])).toEqual([]);
  });

  test("3b the default pane is still the main landmark", async () => {
    const view = renderWithQueryClient(
      <SettingsShell area={area("chat")} viewer={ADULT} registry={REGISTRY} honouredBy="home" activeSection="general" onNavigate={() => {}} searchQuery="" onSearchChange={() => {}} />,
    );
    expect((view.container.querySelector("[data-slot=settings-content]") as HTMLElement).tagName).toBe("MAIN");
  });
});

describe("KIT-SET-05 touch targets and layout contracts", () => {
  test("5 every row control carries an always-on 48 px overhang; text fields sit in a hit label", async () => {
    const { container } = await renderShell("section");
    const rowButtons = container.querySelectorAll("[data-slot=sidebar-menu-button]");
    expect(rowButtons.length).toBeGreaterThan(0);
    for (const b of rowButtons) expect(b.className).toContain("before:-inset-y-[9px]");
    const search = container.querySelector("[data-slot=sidebar-input]") as HTMLElement;
    expect(search.closest("[data-slot=hit-field]")).not.toBeNull();
    const sw = container.querySelector("[data-slot=switch]") as HTMLElement;
    expect(sw.className).toContain("after:-inset-y-3.5");
  });

  test("5b column rows are spaced by the token so neighbouring hit areas do not overlap", async () => {
    const { container } = await renderShell("section");
    const menu = container.querySelector("[data-slot=sidebar-menu]") as HTMLElement;
    expect(menu.className).toContain("gap-[var(--settings-column-row-gap)]");
  });

  test("6 the shell fills the viewport and stretches its column and pane", async () => {
    const { container } = await renderShell("section");
    const root = container.querySelector("[data-slot=settings-shell]") as HTMLElement;
    expect(root.className).toContain("min-h-[var(--settings-shell-min-height)]");
    expect(root.className).toContain("min-w-0");
    expect((container.querySelector("[data-slot=settings-column]") as HTMLElement).className).toContain("self-stretch");
    expect((container.querySelector("[data-slot=settings-content]") as HTMLElement).className).toContain("self-stretch");
  });

  test("6b a non-switch control stacks under the helper text on a phone; a switch stays beside it", async () => {
    const { container } = await renderShell("section");
    await act(async () => {
      fireEvent.click(container.querySelector("[data-slot=collapsible-trigger]")!);
    });
    const rows = [...container.querySelectorAll("[data-slot=item][data-size=setting]")] as HTMLElement[];
    const text = rows.find((r) => r.getAttribute("data-setting-key") === "a.two")!;
    const toggle = rows.find((r) => r.getAttribute("data-setting-key") === "a.one")!;
    expect(text.querySelector("[data-slot=item-content]")!.className).toContain("basis-full");
    expect(text.querySelector("[data-slot=item-actions]")!.className).toContain("w-full");
    expect(toggle.querySelector("[data-slot=item-content]")!.className).not.toContain("basis-full");
  });
});

// 4 colour contrast, from the real token values for Neutral light and dark.
const css = readFileSync(resolve(import.meta.dir, "../tokens.css"), "utf8");
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (bg: string, fg: string, t: number) => "#" + hex(bg).map((v, i) => Math.round(v + (hex(fg)[i]! - v) * t).toString(16).padStart(2, "0")).join("");
const lum = (h: string) => {
  const [r, g, b] = hex(h).map((v) => ((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))(v / 255));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};
function pct(source: string, name: string): number {
  const m = new RegExp(`${name}:\\s*color-mix\\(in srgb, var\\(--background\\), var\\(--foreground\\) ([\\d.]+)%\\)`).exec(source);
  if (!m) throw new Error(`${name} not found`);
  return Number(m[1]) / 100;
}
const lightBlock = css.slice(css.indexOf(":root:not(.dark),"));
const darkBlock = css.slice(css.indexOf(":root,\nbody {"));

describe("KIT-SET-05 colour (real token values)", () => {
  const themes = [
    { name: "light", bg: "#ffffff", fg: "#0a0a0a", src: lightBlock },
    { name: "dark", bg: "#0a0a0a", fg: "#fafafa", src: darkBlock },
  ];
  for (const t of themes) {
    test(`4 ${t.name}: title and helper text hold 4.5:1 on the card and the page`, () => {
      const card = mix(t.bg, t.fg, pct(t.src, "--settings-card"));
      const helper = mix(t.bg, t.fg, pct(t.src, "--settings-helper"));
      expect(ratio(t.fg, card)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(helper, card)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(helper, t.bg)).toBeGreaterThanOrEqual(4.5);
    });
  }

  test("6c light cards are an off-white fill on the white page with a visible hairline, not grey", () => {
    const card = mix("#ffffff", "#0a0a0a", pct(lightBlock, "--settings-card"));
    const border = mix("#ffffff", "#0a0a0a", pct(lightBlock, "--settings-card-border"));
    expect(hex(card).every((v) => v >= 240)).toBe(true);
    expect(ratio(border, "#ffffff")).toBeGreaterThan(1.1);
    expect(card).not.toBe("#ffffff");
  });
});
