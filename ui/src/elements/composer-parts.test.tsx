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
    expect(view.getByRole("button", { name: "Presets" }).textContent).toBe("Presets");
    fireEvent.click(view.getByRole("button", { name: "Presets" }));
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
    expect(panel.className).toContain("rounded-[30px]");
    expect(panel.className).toContain("--hairline");
    expect(view.getByRole("textbox", { name: "Describe" }).className).toContain("text-xl");
    const chip = view.getByRole("button", { name: "Settings: Landscape" });
    expect(chip.className).not.toMatch(/\bborder\b|bg-background/);
    expect(chip.textContent).toBe("Landscape");
    const primary = view.getByRole("button", { name: "Generate" });
    expect(primary.textContent).toBe("Generate");
    expect(primary.className).toContain("h-14");
    expect(primary.className).toContain("bg-primary");
  });
  test("several settings of a group read joined with a slash in one chip", () => {
    const list = modes();
    list[0] = { ...list[0]!, chips: [shape(), { id: "n", label: "Count", group: "Settings", value: 1, onValueChange: () => {}, options: [{ value: 1, label: "1" }, { value: 4, label: "4" }] }] };
    const view = render(<Harness list={list} />);
    expect(view.getByRole("button", { name: "Settings: Landscape / 1" }).textContent).toBe("Landscape / 1");
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
    fireEvent.click(view.getByRole("button", { name: /^Quality/ }));
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
