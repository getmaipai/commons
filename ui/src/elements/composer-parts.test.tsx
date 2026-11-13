import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { useState } from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { PromptBar, type PromptBarMode } from "./prompt-bar";
import { qualityChipFor, type ComposerChipData, type ComposerQualityData } from "./composer-parts";

afterEach(cleanup);

const shape = (onValueChange: (v: string | number) => void = () => {}, disabledReason?: string): ComposerChipData => ({
  id: "shape", label: "Shape", group: "Settings", value: "landscape", onValueChange, disabledReason,
  options: [{ value: "landscape", label: "Landscape" }, { value: "portrait", label: "Portrait" }],
});

const modes = (picks: (string | number)[] = []): PromptBarMode[] => [
  { id: "image", label: "Image", icon: "image", primaryLabel: "Generate", placeholder: "Describe the picture", references: [{ id: "pic", label: "Picture", kind: "picture" }], chips: [shape((v) => picks.push(v))], presets: { label: "Presets", chips: [{ id: "tpl", label: "Template", value: "none", onValueChange: () => {}, options: [{ value: "none", label: "None" }, { value: "poster", label: "Poster" }] }] }, tools: ["clear", "improve"] },
  { id: "music", label: "Music", icon: "music", primaryLabel: "Generate song", placeholder: "Describe the song", references: [], chips: [{ id: "lyrics", label: "Lyrics", value: "auto", onValueChange: () => {}, options: [{ value: "auto", label: "Auto" }, { value: "none", label: "None" }] }], tools: ["clear"] },
];

function Harness({ initial = "image", list = modes(), quality }: { initial?: string; list?: PromptBarMode[]; quality?: ComposerQualityData }) {
  const [mode, setMode] = useState(initial);
  const [text, setText] = useState("a fox");
  return <PromptBar label="Describe" value={text} onValueChange={setText} onSubmit={() => {}} modes={list} mode={mode} onModeChange={setMode} quality={quality} />;
}

describe("composer modes", () => {
  test("a multi-reference slot draws each choice and only shows add while under max", () => {
    const list = modes();
    list[0] = { ...list[0]!, references: [{ id: "pic", label: "Image reference", kind: "picture", max: 3, value: "file-a,file-b", onPick: () => {}, onRemove: () => {} }] };
    const view = render(<Harness list={list} />);
    expect(view.getByRole("button", { name: "Remove Image reference 1" })).not.toBeNull();
    expect(view.getByRole("button", { name: "Remove Image reference 2" })).not.toBeNull();
    expect(view.getByRole("button", { name: "Add Image reference" })).not.toBeNull();
    cleanup();
    const full = modes();
    full[0] = { ...full[0]!, references: [{ id: "pic", label: "Image reference", kind: "picture", max: 2, value: "file-a,file-b" }] };
    const fullView = render(<Harness list={full} />);
    expect(fullView.container.querySelector('button[aria-label="Add Image reference"]')).toBeNull();
  });
  test("a mode shows only its own slots and chips, and the placeholder changes with it", () => {
    const view = render(<Harness />);
    const box = () => view.getByRole("textbox", { name: "Describe" });
    expect(box().getAttribute("placeholder")).toBe("Describe the picture");
    expect(view.getByRole("button", { name: "Add Picture" })).not.toBeNull();
    expect(view.getByRole("button", { name: "Settings: Landscape" })).not.toBeNull();
    expect(view.queryByRole("button", { name: /^Lyrics/ })).toBeNull();
    fireEvent.click(view.getByRole("button", { name: "Mode: Image" }));
    fireEvent.click(view.getByRole("option", { name: "Music" }));
    expect(box().getAttribute("placeholder")).toBe("Describe the song");
    expect(view.queryByRole("button", { name: "Add Picture" })).toBeNull();
    expect(view.queryByRole("button", { name: /^Settings/ })).toBeNull();
    expect(view.getByRole("button", { name: "Lyrics: Auto" })).not.toBeNull();
    // The field stays the same element through the change: nothing re-mounts, so nothing jumps.
    expect(view.getByRole("textbox", { name: "Describe" })).toBe(box());
    expect(box().getAttribute("data-placeholder-fade")).toMatch(/^[ab]$/);
  });

  test("the slot row closes through the collapse tokens, not a jump", () => {
    const view = render(<Harness />);
    const zone = view.container.querySelector('[data-slot="composer-mode-zone"]')!;
    expect(zone.getAttribute("data-open")).toBe("true");
    fireEvent.click(view.getByRole("button", { name: "Mode: Image" }));
    fireEvent.click(view.getByRole("option", { name: "Music" }));
    const after = view.container.querySelector('[data-slot="composer-mode-zone"]')!;
    expect(after.getAttribute("data-open")).toBe("false");
    expect(after.className).toContain("grid-rows-[0fr]");
    expect(after.className).toContain("--motion-collapse");
  });

  test("a chip with a reason is drawn disabled and says why", () => {
    const picks: (string | number)[] = [];
    const list = modes(picks);
    list[0] = { ...list[0]!, chips: [shape((v) => picks.push(v), "Portrait needs the video engine, which is not ready.")] };
    const view = render(<Harness list={list} />);
    fireEvent.click(view.getByRole("button", { name: "Settings: Landscape" }));
    const radio = view.getByRole("radio", { name: "Portrait" });
    expect(radio.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(radio);
    expect(picks).toEqual([]);
    expect(view.getByRole("status").textContent).toContain("not ready");
  });

  test("chips and the mode pill are keyboard reachable: native buttons, arrows move the choice", () => {
    const picks: (string | number)[] = [];
    const view = render(<Harness list={modes(picks)} />);
    const trigger = view.getByRole("button", { name: "Settings: Landscape" });
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    expect(trigger.tabIndex).toBe(0);
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const on = view.getByRole("radio", { name: "Landscape" });
    expect(on.tabIndex).toBe(0);
    expect(view.getByRole("radio", { name: "Portrait" }).tabIndex).toBe(-1);
    fireEvent.keyDown(on, { key: "ArrowRight" });
    expect(picks).toEqual(["portrait"]);
    const pill = view.getByRole("button", { name: "Mode: Image" });
    fireEvent.keyDown(pill, { key: "ArrowDown" });
    expect(view.getByRole("listbox", { name: "Composer modes" })).not.toBeNull();
    fireEvent.keyDown(view.getByRole("listbox", { name: "Composer modes" }), { key: "Escape" });
    expect(view.queryByRole("listbox", { name: "Composer modes" })).toBeNull();
  });

  test("Presets opens one popover, and the field tools clear and improve are buttons", () => {
    const seen: string[] = [];
    const list = modes();
    list[0] = { ...list[0]!, onTool: (t) => seen.push(t) };
    const view = render(<Harness list={list} />);
    const presets = view.getByRole("button", { name: "Presets" });
    expect(presets.getAttribute("aria-label")).toBe("Presets");
    expect(presets.getAttribute("title")).toBe("Presets");
    expect(presets.textContent).not.toContain("Presets");
    fireEvent.click(presets);
    expect(view.getByRole("radio", { name: "Poster" })).not.toBeNull();
    fireEvent.click(view.getByRole("button", { name: "Improve" }));
    fireEvent.click(view.getByRole("button", { name: "Clear" }));
    expect(seen).toEqual(["improve", "clear"]);
  });

  test("clear empties the field by default and the primary button carries the mode's label and time", () => {
    const list = modes();
    list[0] = { ...list[0]!, primary: { label: "Plan the film", detail: "About 3 minutes" } };
    const view = render(<Harness list={list} />);
    expect(view.getByRole("button", { name: "Plan the film" }).getAttribute("title")).toBe("Plan the film · About 3 minutes");
    fireEvent.click(view.getByRole("button", { name: "Clear" }));
    expect((view.getByRole("textbox", { name: "Describe" }) as HTMLTextAreaElement).value).toBe("");
  });
});

describe("unified panel look", () => {
  test("one large panel, borderless large field, plain chips, one big primary button with its words", () => {
    const view = render(<Harness />);
    const panel = view.container.querySelector('[data-slot="prompt-bar-composer"]') as HTMLElement;
    expect(panel.getAttribute("data-unified")).toBe("true");
    expect(panel.className).toContain("surface-float");
    expect(panel.className).toContain("--elev-2-radius:30px");
    expect(panel.className).not.toMatch(/\brounded-|\bshadow-|bg-\[/);
    expect(view.getByRole("textbox", { name: "Describe" }).className).toContain("text-xl");
    const chip = view.getByRole("button", { name: "Settings: Landscape" });
    expect(chip.className).not.toMatch(/\bborder\b|bg-background/);
    expect(chip.textContent).toBe("Landscape");
    const primary = view.getByRole("button", { name: "Generate" });
    expect(primary.textContent).toBe("Generate");
    expect(primary.className).toContain("size-14");
    expect(primary.className).toContain("bg-primary");
  });
  test("several settings of a group read joined with a slash in one chip", () => {
    const list = modes();
    list[0] = { ...list[0]!, chips: [shape(), { id: "n", label: "Count", group: "Settings", value: 1, onValueChange: () => {}, options: [{ value: 1, label: "1" }, { value: 4, label: "4" }] }] };
    const view = render(<Harness list={list} />);
    expect(view.getByRole("button", { name: "Settings: Landscape · 1" }).textContent).toBe("Landscape · 1");
  });
  test("icon-only choices show their chosen icon and the whole group reads as the icon alone", () => {
    const list = modes();
    list[0] = { ...list[0]!, chips: [
      { ...shape(), iconOnly: true, icon: "sliders-horizontal", options: [{ value: "landscape", label: "Landscape", icon: "image" }, { value: "portrait", label: "Portrait" }] },
      { id: "count", label: "Count", group: "Settings", value: 1, onValueChange: () => {}, options: [{ value: 1, label: "1 picture" }] },
    ] };
    const view = render(<Harness list={list} />);
    const trigger = view.getByRole("button", { name: "Shape · Count: Landscape · 1 picture" });
    expect(trigger.getAttribute("title")).toBe("Shape · Count: Landscape · 1 picture");
    expect(trigger.querySelector("svg")?.getAttribute("class")).toContain("lucide-image");
    expect(trigger.textContent).toBe("");
    fireEvent.click(trigger);
    expect(view.getByRole("radio", { name: "Landscape" })).not.toBeNull();
    expect(view.getByRole("radio", { name: "Portrait" })).not.toBeNull();
  });
});

describe("fixes from use", () => {
  test("allowEmpty lets a mode submit from its chips alone; other modes still need words", () => {
    let made = 0;
    const list = modes();
    list[0] = { ...list[0]!, allowEmpty: true, primary: { label: "Make sound" } };
    function Empty({ list: l }: { list: PromptBarMode[] }) {
      return <PromptBar label="Describe" value="" onValueChange={() => {}} onSubmit={() => { made += 1; }} modes={l} mode="image" onModeChange={() => {}} />;
    }
    const view = render(<Empty list={list} />);
    const go = view.getByRole("button", { name: "Make sound" }) as HTMLButtonElement;
    expect(go.disabled).toBe(false);
    fireEvent.click(go);
    expect(made).toBe(1);
    cleanup();
    const strict = render(<Empty list={modes()} />);
    expect((strict.getByRole("button", { name: "Generate" }) as HTMLButtonElement).disabled).toBe(true);
  });
  test("chip popovers scroll inside the available height, and the mode list uses the opaque menu surface", () => {
    const view = render(<Harness />);
    fireEvent.click(view.getByRole("button", { name: "Settings: Landscape" }));
    const pop = document.querySelector('[data-slot="popover-content"]') as HTMLElement;
    expect(pop.className).toContain("overflow-y-auto");
    expect(pop.className).toContain("--radix-popover-content-available-height");
    fireEvent.click(view.getByRole("button", { name: "Mode: Image" }));
    const list = view.getByRole("listbox", { name: "Composer modes" });
    expect(list.className).toContain("surface-menu");
    expect(list.className).not.toMatch(/bg-popover\/|backdrop-blur/);
  });
  test("the bottom row never wraps: pill, chips, primary on one line; the chips scroll inside their own room", () => {
    const view = render(<Harness />);
    const row = view.container.querySelector('[data-slot="prompt-bar-composer-controls"]')!;
    expect(row.className).toContain("flex-nowrap");
    expect(row.className).not.toContain("flex-wrap");
    const kids = [...row.children].map((el) => el.getAttribute("data-slot") ?? el.tagName);
    expect(kids[0]).toBe("composer-mode-pill");
    expect(row.lastElementChild!.tagName).toBe("BUTTON");
    const chips = row.querySelector('[data-slot="composer-chips"]') as HTMLElement;
    expect(chips.className).toContain("overflow-x-auto");
    expect(chips.className).toContain("mask-image");
    expect(chips.closest('[data-slot="composer-mode-zone"]')!.className).toContain("flex-1");
  });
});

describe("combined chips", () => {
  const fam = (id: string, label: string, labels: string[], value: string | number, quiet?: string | number): ComposerChipData => ({ id, label, group: "Style", value, quietValue: quiet, onValueChange: () => {}, options: labels.map((l, i) => ({ value: i === 0 ? "none" : l, label: l })) });
  test("many families in one group are one chip: quiet values stay out of the words, three or more open as tabs", () => {
    const list = modes();
    list[0] = { ...list[0]!, chips: [fam("look", "Look", ["Auto", "Art"], "Art"), fam("light", "Light", ["Auto", "Golden hour"], "Golden hour", "none"), fam("angle", "Angle", ["Auto", "Low angle"], "none", "none"), fam("format", "Format", ["Auto", "Poster"], "none", "none")] };
    const view = render(<Harness list={list} />);
    const chip = view.getByRole("button", { name: /^Style:/ });
    expect(chip.textContent).toBe("Art · Golden hour");
    fireEvent.click(chip);
    const tabs = view.getAllByRole("tab").map((t) => t.textContent);
    expect(tabs.length).toBe(4);
    expect(view.getAllByRole("tab")[0]!.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(view.getAllByRole("tab")[0]!, { key: "ArrowRight" });
    expect(view.getAllByRole("tab")[1]!.getAttribute("aria-selected")).toBe("true");
    expect(view.getByRole("tabpanel")).not.toBeNull();
  });
  test("more than three groups fold the rest under one More chip", () => {
    const list = modes();
    const g = (n: string): ComposerChipData => ({ id: n, label: n, group: n, value: "a", onValueChange: () => {}, options: [{ value: "a", label: n + " A" }, { value: "b", label: n + " B" }] });
    list[0] = { ...list[0]!, chips: [g("One"), g("Two"), g("Three"), g("Four"), g("Five")] };
    const view = render(<Harness list={list} />);
    expect(view.getByRole("button", { name: "One: One A" })).not.toBeNull();
    expect(view.queryByRole("button", { name: /^Four/ })).toBeNull();
    fireEvent.click(view.getByRole("button", { name: "More" }));
    expect(view.getAllByRole("radiogroup").map((r) => r.getAttribute("aria-labelledby"))).toEqual(["composer-chip-Four", "composer-chip-Five"]);
  });
  test("a mode with onAdd draws the round plus in the top row", () => {
    const list = modes();
    let added = 0;
    list[0] = { ...list[0]!, onAdd: () => { added += 1; } };
    const view = render(<Harness list={list} />);
    fireEvent.click(view.getByRole("button", { name: "Add files" }));
    expect(added).toBe(1);
  });
});

describe("icon_only on a combined chip", () => {
  test("a group with an icon-only chip is the icon alone, its name reads every family, the popover lists both", () => {
    const list = modes();
    const shape2: ComposerChipData = { id: "shape", label: "Shape", group: "Settings", iconOnly: true, icon: "image", value: "l", onValueChange: () => {}, options: [{ value: "l", label: "Landscape" }, { value: "p", label: "Portrait" }] };
    const length: ComposerChipData = { id: "length", label: "Length", group: "Settings", value: 5, onValueChange: () => {}, options: [{ value: 5, label: "5 s" }, { value: 10, label: "10 s" }] };
    list[0] = { ...list[0]!, chips: [shape2, length] };
    const view = render(<Harness list={list} />);
    const chip = view.getByRole("button", { name: "Shape · Length: Landscape · 5 s" });
    expect(chip.getAttribute("title")).toBe("Shape · Length: Landscape · 5 s");
    expect(chip.textContent).toBe("");
    fireEvent.click(chip);
    expect(view.getAllByRole("radiogroup").map((r) => r.getAttribute("aria-labelledby"))).toEqual(["composer-chip-shape", "composer-chip-length"]);
  });
});

describe("overflow label", () => {
  const g = (n: string): ComposerChipData => ({ id: n, label: n, group: n, value: "a", onValueChange: () => {}, options: [{ value: "a", label: n + " A" }, { value: "b", label: n + " B" }] });
  test("one group over the cap keeps its own name; More appears only for two or more", () => {
    const list = modes();
    list[0] = { ...list[0]!, chips: [g("Settings"), g("Style"), g("Camera"), g("Shot")] };
    const one = render(<Harness list={list} />);
    expect(one.getByRole("button", { name: "Shot: Shot A" })).not.toBeNull();
    expect(one.queryByRole("button", { name: "More" })).toBeNull();
    cleanup();
    list[0] = { ...list[0]!, chips: [g("Settings"), g("Style"), g("Camera"), g("Shot"), g("Sound")] };
    const two = render(<Harness list={list} />);
    expect(two.getByRole("button", { name: "More" })).not.toBeNull();
  });
});

describe("single mode", () => {
  test("a composer with one mode draws no mode pill, and still shows its slots and chips", () => {
    const view = render(<Harness list={[modes()[0]!]} />);
    expect(view.queryByRole("button", { name: /^Mode:/ })).toBeNull();
    expect(view.getByRole("button", { name: "Add Picture" })).not.toBeNull();
    expect(view.getByRole("button", { name: "Settings: Landscape" })).not.toBeNull();
  });
});

describe("Quality chip", () => {
  const quality = (band?: ComposerQualityData["band"]): ComposerQualityData => ({
    value: "boost", onValueChange: () => {}, band,
    options: [
      { value: "standard", label: "Standard", detail: "Fast" },
      { value: "boost", label: "Boost", detail: "More detail" },
      { value: "max", label: "Max", detail: "Best quality" },
      { value: "thinking", label: "Thinking", kind: "thinking" },
      { value: "model:a", label: "Model A", kind: "model" },
    ],
  });

  test("a child, a teen or an unknown band never sees Thinking or a model choice", () => {
    for (const band of ["child", "teen", undefined] as const) {
      const chip = qualityChipFor(quality(band))!;
      expect(chip.options.map((o) => o.label)).toEqual(["Standard", "Boost", "Max"]);
    }
    expect(qualityChipFor(quality("adult"))!.options.map((o) => o.label)).toEqual(["Standard", "Boost", "Max", "Thinking", "Model A"]);
  });

  test("a restricted band whose value is a Thinking choice falls back to the first tier, and the popover lists tiers only", () => {
    const q = { ...quality("child"), value: "thinking" };
    expect(qualityChipFor(q)!.value).toBe("standard");
    const view = render(<Harness quality={q} />);
    const qualityTrigger = view.getByRole("button", { name: "Quality: Standard" });
    expect(qualityTrigger.getAttribute("aria-label")).toBe("Quality: Standard");
    expect(qualityTrigger.getAttribute("title")).toBe("Quality: Standard");
    expect(qualityTrigger.textContent).not.toContain("Quality");
    expect(qualityTrigger.textContent).not.toContain("Standard");
    fireEvent.click(qualityTrigger);
    expect(view.getAllByRole("radio").map((r) => r.textContent?.replace(/(Fast|More detail|Best quality)$/, ""))).toEqual(expect.arrayContaining(["Standard", "Boost", "Max"]));
    expect(view.queryByRole("radio", { name: /Thinking|Model/ })).toBeNull();
  });
});

describe("motion", () => {
  const css = readFileSync(new URL("../tokens.css", import.meta.url), "utf8");
  test("every motion the composer uses comes from the MOTION-01 tokens, and reduced motion zeroes it", () => {
    const parts = readFileSync(new URL("./composer-parts.tsx", import.meta.url), "utf8");
    expect(parts).toContain("motion-fade");
    expect(parts).toContain("--motion-collapse-in");
    expect(parts).not.toMatch(/duration-(75|100|150|200|300|500)\b/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\*,\s*\*::before,\s*\*::after \{\s*animation-duration: 0\.01ms !important;/);
    expect(css).toMatch(/\[data-placeholder-fade="a"\]::placeholder \{\s*animation: motion-fade-in var\(--motion-fade-in\)/);
  });
});
